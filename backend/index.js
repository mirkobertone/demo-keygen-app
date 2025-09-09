require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

// Stripe Checkout Session Endpoint
app.post("/create-checkout-session", async (req, res) => {
  const { priceId, customerEmail } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: customerEmail,
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?canceled=true`,
      metadata: {
        customer_email: customerEmail,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Basic Keygen API proxy (optional, for fetching license info later)
// You'd likely want more robust handling and auth for this in production
// app.get("/api/v1/licenses/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const response = await axios.get(
//       `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/licenses`,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
//           Accept: "application/vnd.api+json",
//         },
//         params: {
//           "filter[user]": userId,
//         },
//       }
//     );
//     console.log("user id", userId);

//     console.log(response.data);
//     res.json(response.data);
//   } catch (error) {
//     console.error(
//       "Error fetching Keygen licenses:",
//       error.response ? error.response.data : error.message
//     );
//     res.status(500).json({ error: "Failed to fetch licenses" });
//   }
// });

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
        const stripeCustomer = await stripe.customers.create({
          description: `Customer for Keygen user ${keygenUser.attributes.email}`,
          email: keygenUser.attributes.email,
          // Source is a Stripe token obtained with Stripe.js during user creation and
          // temporarily stored in the user's metadata attribute.
          // source: keygenUser.attributes.metadata.stripeToken || "",
          // Store the user's Keygen ID within the Stripe customer so that we can lookup
          // a Stripe customer's Keygen account.
          metadata: { keygenUserId: keygenUser.id },
        });
        console.log("stripe customer", stripeCustomer);

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
                  metadata: { stripeCustomerId: stripeCustomer.id },
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
        // user. Let Keygen know the event was received successfully.
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
app.post("/create-customer-portal-session", async (req, res) => {
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
});

app.post("/supabase-webhook", async (req, res) => {
  console.log("supabase webhook received");
  console.log("supabase webhook event", req.body);
  const { table, type, record } = req.body;

  if (table === "users") {
    if (type === "INSERT") {
      try {
        // Create a user in Keygen
        // Create the user
        const response = await fetch(
          `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/users`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/vnd.api+json",
              Accept: "application/vnd.api+json",
              Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
            },
            body: JSON.stringify({
              data: {
                type: "users",
                attributes: {
                  firstName: record.first_name || "",
                  lastName: record.last_name || "",
                  email: record.email || "",
                  password: record.password || "testtest",
                },
                metadata: {
                  supabase_user_id: record.id,
                },
              },
            }),
          }
        );
        const { data: user, errors } = await response.json();
        // console.log("keygen user response", user);
        console.log("keygen errors", errors);

        res.sendStatus(200);
      } catch (error) {
        console.error("Error creating Keygen user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }

    // if (type === "DELETE") {
    //   try {
    //     // Delete the user from Keygen
    //     const response = await fetch(
    //       `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/users/${record.metadata.keygen_user_id}`,
    //       {
    //         method: "DELETE",
    //         headers: {
    //           Authorization: `Bearer ${process.env.KEYGEN_PRODUCT_TOKEN}`,
    //           "Content-Type": "application/vnd.api+json",
    //           Accept: "application/vnd.api+json",
    //         },
    //       }
    //     );
    //     const { data, errors } = await response.json();
    //     console.log("keygen user response", data);
    //     console.log("keygen errors", errors);

    //     // Delete the user from Stripe
    //     const stripeCustomer = await stripe.customers.del(
    //       record.stripe_customer_id
    //     );
    //     console.log("stripe customer", stripeCustomer);

    //     res.sendStatus(200);
    //   } catch (error) {
    //     console.error("Error deleting Keygen user:", error);
    //     res.status(500).json({ error: "Internal server error" });
    //   }
    // }
  }
});

// Start the server
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
