require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const {
  authenticateUser,
  retrieveLicense,
  createAccount,
} = require("./keygen");

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JWT secret for signing tokens
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser tools
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// Register preflight handlers only for known POST endpoints
app.options("/create-checkout-session", cors());
app.options("/create-customer-portal-session", cors());
app.options("/stripe-webhooks", cors());
app.options("/keygen-webhooks", cors());
app.options("/auth/signup", cors());
app.options("/auth/signin", cors());
app.options("/auth/signout", cors());

// Stripe Webhook Handler (must be before express.json() middleware)
app.post(
  "/stripe-webhooks",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        const customerEmail = session.customer_details.email;
        const stripeCustomerId = session.customer;
        const subscriptionId = session.subscription;

        console.log(`Checkout session completed for ${customerEmail}.`);
        console.log("customer details", session.customer_details);
        console.log("stripe customer id", stripeCustomerId);
        console.log("subscription id", subscriptionId);
        // Create a user in Keygen
        try {
          const keygenUserResponse = await axios.post(
            `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/licenses`,
            {
              data: {
                type: "licenses",
                attributes: {
                  metadata: {
                    stripe_customer_id: stripeCustomerId,
                    stripe_subscription_id: subscriptionId,
                  },
                },
                relationships: {
                  policy: {
                    data: {
                      type: "policies",
                      id: process.env.KEYGEN_POLICY_ID,
                    },
                  },
                  user: {
                    data: {
                      type: "users",
                      id: stripeCustomerId,
                    },
                  },
                },
              },
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
                Accept: "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
              },
            }
          );

          const { data, errors } = await keygenUserResponse.json();
          console.log("keygen license", data);
          console.log("keygen errors", errors);
          s; // You can store the relationship between stripeCustomerId, subscriptionId,
          // keygenUserId, and keygenLicenseId in your database here.
        } catch (keygenError) {
          console.error(
            "Error creating Keygen user or license:",
            keygenError.response
              ? keygenError.response.data
              : keygenError.message
          );
        }
        break;

      case "customer.subscription.deleted":
        const subscription = event.data.object;
        const deletedCustomerId = subscription.customer;

        console.log(`Subscription deleted for customer: ${deletedCustomerId}`);

        // Optionally revoke licenses when subscription is canceled
        // This would require finding the user by stripe_customer_id in metadata
        // and then revoking their licenses
        break;

      case "invoice.payment_failed":
        const invoice = event.data.object;
        const failedCustomerId = invoice.customer;

        console.log(`Payment failed for customer: ${failedCustomerId}`);

        // Optionally suspend licenses when payment fails
        // This would require finding the user by stripe_customer_id in metadata
        // and then suspending their licenses
        break;

      case "invoice.payment_succeeded":
        const successfulInvoice = event.data.object;
        const successfulCustomerId = successfulInvoice.customer;

        console.log(`Payment succeeded for customer: ${successfulCustomerId}`);

        // Optionally reactivate licenses when payment succeeds after failure
        // This would require finding the user by stripe_customer_id in metadata
        // and then reactivating their licenses
        break;

      case "invoice.paid":
        console.log("invoice paid", event.data.object);
        const customer = event.data.object.customer;
        console.log("customer", customer);
        const stripeCustomerWithMetadata = await stripe.customers.retrieve(
          customer,
          {
            expand: ["subscriptions"],
          }
        );
        console.log(
          "stripe customer with metadata",
          stripeCustomerWithMetadata
        );
        const stripeSubscriptionId =
          stripeCustomerWithMetadata.subscriptions.data[0].id;

        // const createdSubscription = event.data.object;
        // const createdCustomerId = createdSubscription.customer;
        // const stripeSubscriptionId = createdSubscription.id;
        // console.log(`Subscription created for customer: ${createdCustomerId}`);

        // const keygenLicense = await fetch(
        //   `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/licenses`,
        //   {
        //     method: "POST",
        //     headers: {
        //       Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
        //       "Content-Type": "application/vnd.api+json",
        //       Accept: "application/vnd.api+json",
        //     },
        //     body: JSON.stringify({
        //       data: {
        //         type: "licenses",
        //         attributes: {
        //           metadata: { stripeSubscriptionId: stripeSubscriptionId },
        //         },
        //         relationships: {
        //           policy: {
        //             data: {
        //               type: "policies",
        //               id: process.env.KEYGEN_POLICY_ID,
        //             },
        //           },
        //           user: {
        //             data: {
        //               type: "users",
        //               id: stripeCustomer.metadata.keygenUserId,
        //             },
        //           },
        //         },
        //       },
        //     }),
        //   }
        // );
        // const { data, errors } = await keygenLicense.json();
        // if (errors) {
        //   res.sendStatus(500);

        //   // If you receive an error here, then you may want to handle the fact the customer
        //   // may have been charged for a license that they didn't receive e.g. easiest way
        //   // would be to create it manually, or refund their subscription charge.
        //   throw new Error(errors.map((e) => e.detail).toString());
        // }

        // All is good! License was successfully created for the new Stripe customer's
        // Keygen user account. Next up would be for us to email the license key to
        // our user's email using `stripeCustomer.email` or something similar.

        // Let Stripe know the event was received successfully.
        res.sendStatus(200);
        break;

      // Handle other event types if needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.sendStatus(200);
  }
);

// Add JSON parsing middleware for non-webhook routes
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
  console.log("token", token);
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    console.log("err", err);
    console.log("user", user);
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    console.log("user", user);
    next();
  });
};

// Authentication endpoints
app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create a user in Keygen
    const keygenUser = await createAccount(email, password, data.user.id);
    console.log("keygen user", keygenUser);

    res.json({
      message:
        "User created successfully. Please check your email for confirmation.",
      user: data.user,
      keygenUser,
      keygenErrors: errors,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/auth/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // First authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const authUser = await authenticateUser(email, password);
    console.log("authUser", authUser);
    // Create JWT token
    const token = jwt.sign(
      {
        userId: data.user.id,
        email: data.user.email,
        keygenUserId: authUser.id,
        keygenToken: authUser.attributes.token,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      user: data.user,
      session: data.session,
      token,
      keygenToken: authUser.attributes.token,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/auth/signout", authenticateToken, async (req, res) => {
  try {
    // Note: Server-side signout doesn't invalidate the JWT token
    // In a production app, you might want to maintain a blacklist of tokens
    res.json({ message: "Signed out successfully" });
  } catch (error) {
    console.error("Signout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/auth/verify", authenticateToken, async (req, res) => {
  try {
    // Get fresh user data from Supabase using admin API
    const response = await axios.get(
      `${process.env.SUPABASE_URL}/auth/v1/admin/users/${req.user.userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    const user = response.data;

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user,
      keygenUserId: user.user_metadata?.keygen_user_id,
    });
  } catch (error) {
    console.error("Verify error:", error);
    if (error.response?.status === 404) {
      return res.status(401).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/auth/user", authenticateToken, async (req, res) => {
  try {
    // Get fresh user data from Supabase using admin API
    const response = await axios.get(
      `${process.env.SUPABASE_URL}/auth/v1/admin/users/${req.user.userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    const user = response.data;
    console.log("user", user);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user,
      keygenUserId: user.user_metadata?.keygen_user_id,
    });
  } catch (error) {
    console.error("Get user error:", error);
    if (error.response?.status === 404) {
      return res.status(401).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Stripe Checkout Session Endpoint
app.post("/create-checkout-session", authenticateToken, async (req, res) => {
  const { priceId, customerEmail, stripeCustomerId } = req.body;

  // Require stripeCustomerId to prevent creating new customers
  if (!stripeCustomerId) {
    return res.status(400).json({
      error: "stripeCustomerId is required. Cannot create new customers.",
    });
  }

  try {
    // Verify the customer exists before creating checkout session
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    if (customer.deleted) {
      return res.status(400).json({
        error: "Customer has been deleted and cannot be used.",
      });
    }

    console.log(
      `Using existing customer: ${stripeCustomerId} (${customer.email})`
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer: stripeCustomerId, // Always use existing customer
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?canceled=true`,
      metadata: {
        customer_email: customerEmail,
        stripe_customer_id: stripeCustomerId,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);

    if (
      error.type === "StripeInvalidRequestError" &&
      error.code === "resource_missing"
    ) {
      res.status(400).json({
        error: "Customer not found. Please provide a valid stripeCustomerId.",
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Helper endpoint to get user's Keygen ID from Supabase user metadata
app.post("/get-user-keygen-id", authenticateToken, async (req, res) => {
  const { supabaseUserId } = req.body;

  if (!supabaseUserId) {
    return res.status(400).json({ error: "supabaseUserId is required" });
  }

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/admin/users/${supabaseUserId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase request failed: ${response.status}`);
    }

    const user = await response.json();

    if (user && user.user_metadata && user.user_metadata.keygen_user_id) {
      res.json({
        found: true,
        keygenUserId: user.user_metadata.keygen_user_id,
        supabaseUserId: supabaseUserId,
      });
    } else {
      res.json({
        found: false,
        message: "Keygen user ID not found in user metadata",
      });
    }
  } catch (error) {
    console.error("Error getting user Keygen ID:", error);
    res.status(500).json({ error: error.message });
  }
});

// Basic Keygen API proxy (optional, for fetching license info later)
// You'd likely want more robust handling and auth for this in production
app.get("/api/v1/licenses/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // const response = await axios.get(
    //   `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/licenses`,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
    //       Accept: "application/vnd.api+json",
    //     },
    //     params: {
    //       "filter[user]": userId,
    //     },
    //   }
    // );

    const license = await retrieveLicense(req.user.keygenToken);

    console.log("user id", userId);

    res.json(license);
  } catch (error) {
    console.error(
      "Error fetching Keygen licenses:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to fetch licenses" });
  }
});

// Keygen Webhook Handler
app.post("/keygen-webhooks", async (req, res) => {
  console.log("Received Keygen webhook");
  const {
    data: { id: keygenEventId },
  } = req.body;

  // Fetch the webhook to validate it and get its most up-to-date state
  const keygenWebhook = await fetch(
    `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/webhook-events/${keygenEventId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
        Accept: "application/vnd.api+json",
      },
    }
  );
  const { data: keygenEvent, errors } = await keygenWebhook.json();
  // console.log("keygen event", keygenEvent);
  if (errors) {
    return res.sendStatus(200); // Event does not exist (wasn't sent from Keygen)
  }

  try {
    switch (keygenEvent.attributes.event) {
      case "license.created":
        console.log(`License created: ${event.data.id}`);
        // You can add additional logic here, such as sending welcome emails
        break;

      case "license.validated":
        console.log(`License validated: ${event.data.id}`);
        // You can add additional logic here, such as logging usage
        break;

      case "license.invalidated":
        console.log(`License invalidated: ${event.data.id}`);
        // You can add additional logic here, such as notifying the user
        break;
      case "user.created":
        console.log(`User created`);
        // You can add additional logic here, such as sending welcome emails
        const { data: keygenUser } = JSON.parse(keygenEvent.attributes.payload);
        console.log("keygen user", keygenUser);

        // Get Supabase user ID from Keygen user metadata
        const supabaseUserId = keygenUser.attributes.metadata?.supabaseUserId;

        if (supabaseUserId) {
          console.log(
            `Updating Supabase user metadata for user ${supabaseUserId} with Keygen ID: ${keygenUser.id}`
          );

          // Update Supabase user metadata with Keygen user ID using Admin API
          try {
            const supabaseUpdateResponse = await fetch(
              `${process.env.SUPABASE_URL}/auth/v1/admin/users/${supabaseUserId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                },
                body: JSON.stringify({
                  user_metadata: {
                    keygen_user_id: keygenUser.id,
                  },
                }),
              }
            );

            if (supabaseUpdateResponse.ok) {
              console.log(
                `Successfully updated Supabase user metadata for user ${supabaseUserId} with Keygen ID: ${keygenUser.id}`
              );
            } else {
              console.error(
                "Failed to update Supabase user metadata with Keygen ID:",
                await supabaseUpdateResponse.text()
              );
            }
          } catch (supabaseError) {
            console.error(
              "Error updating Supabase user metadata:",
              supabaseError
            );
          }
        } else {
          console.log("No Supabase user ID found in Keygen user metadata");
        }

        // Create Stripe customer for the Keygen user
        const stripeCustomer = await stripe.customers.create({
          description: `Customer for Keygen user ${keygenUser.attributes.email}`,
          email: keygenUser.attributes.email,
          // Store the user's Keygen ID within the Stripe customer so that we can lookup
          // a Stripe customer's Keygen account.
          metadata: {
            keygenUserId: keygenUser.id,
            supabaseUserId: supabaseUserId || null,
          },
        });
        console.log("stripe customer", stripeCustomer);

        // Update Keygen user with Stripe customer ID
        const update = await fetch(
          `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/users/${keygenUser.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
              "Content-Type": "application/vnd.api+json",
              Accept: "application/vnd.api+json",
            },
            body: JSON.stringify({
              data: {
                type: "users",
                attributes: {
                  metadata: {
                    stripeCustomerId: stripeCustomer.id,
                    supabaseUserId: supabaseUserId || null,
                  },
                },
              },
            }),
          }
        );
        const { data, errors } = await update.json();
        if (errors) {
          throw new Error(errors.map((e) => e.detail).toString());
        }

        // All is good! Stripe customer was successfully created for the new Keygen
        // user and Supabase record was updated. Let Keygen know the event was received successfully.
        res.sendStatus(200);
        break;

      default:
        console.log(
          `Unhandled Keygen event type: ${keygenEvent.attributes.event}`
        );
    }
  } catch (error) {
    console.error("Error processing Keygen webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Stripe Customer Portal Session Endpoint
app.post(
  "/create-customer-portal-session",
  authenticateToken,
  async (req, res) => {
    const { stripeCustomerId } = req.body;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL}/dashboard`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating customer portal session:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// app.post("/supabase-webhook", async (req, res) => {
//   console.log("supabase webhook received");
//   console.log("supabase webhook event", req.body);
//   const { table, type, record } = req.body;

//   if (table === "users") {
//     if (type === "INSERT") {
//       try {
//         // Create a user in Keygen
//         // Create the user
//         const response = await fetch(
//           `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/users`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/vnd.api+json",
//               Accept: "application/vnd.api+json",
//               Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
//             },
//             body: JSON.stringify({
//               data: {
//                 type: "users",
//                 attributes: {
//                   firstName: record.first_name || "",
//                   lastName: record.last_name || "",
//                   email: record.email || "",
//                   password: record.password || "testtest",
//                   metadata: {
//                     supabaseUserId: record.id, // Store Supabase user ID in Keygen metadata
//                   },
//                 },
//               },
//             }),
//           }
//         );
//         const { data: user, errors } = await response.json();
//         console.log("keygen user response", user);
//         console.log("keygen errors", errors);

//         if (errors) {
//           throw new Error(errors.map((e) => e.detail).toString());
//         }

//         console.log(
//           `Created Keygen user ${user.id} for Supabase user ${record.id}`
//         );

//         res.sendStatus(200);
//       } catch (error) {
//         console.error("Error creating Keygen user:", error);
//         res.status(500).json({ error: "Internal server error" });
//       }
//     }

//     // if (type === "DELETE") {
//     //   try {
//     //     // Delete the user from Keygen
//     //     const response = await fetch(
//     //       `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/users/${record.metadata.keygen_user_id}`,
//     //       {
//     //         method: "DELETE",
//     //         headers: {
//     //           Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
//     //           "Content-Type": "application/vnd.api+json",
//     //           Accept: "application/vnd.api+json",
//     //         },
//     //       }
//     //     );
//     //     const { data, errors } = await response.json();
//     //     console.log("keygen user response", data);
//     //     console.log("keygen errors", errors);

//     //     // Delete the user from Stripe
//     //     const stripeCustomer = await stripe.customers.del(
//     //       record.stripe_customer_id
//     //     );
//     //     console.log("stripe customer", stripeCustomer);

//     //     res.sendStatus(200);
//     //   } catch (error) {
//     //     console.error("Error deleting Keygen user:", error);
//     //     res.status(500).json({ error: "Internal server error" });
//     //   }
//     // }
//   }
// });

// Test endpoint to verify authentication setup
app.get("/auth/test", (req, res) => {
  res.json({
    message: "Authentication server is running",
    endpoints: {
      signup: "POST /auth/signup",
      signin: "POST /auth/signin",
      signout: "POST /auth/signout",
      verify: "GET /auth/verify",
      user: "GET /auth/user",
    },
  });
});

// Debug endpoint to check headers
app.get("/auth/debug", (req, res) => {
  res.json({
    headers: req.headers,
    authorization: req.headers.authorization,
    user: req.user || "No user in request",
  });
});

// Start the server
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
