require("dotenv").config();

// curl -X POST https://api.keygen.sh/v1/accounts/YOUR_ACCOUNT_ID/tokens \
//   -H "Content-Type: application/vnd.api+json" \
//   -d '{
//     "data": {
//       "type": "tokens",
//       "attributes": {
//         "email": "alice@example.com",
//         "password": "userpassword"
//       }
//     }
//   }'

async function main() {
  //   await createUser();
  const token = await authenticateUser();
  if (token) {
    await retrieveLicense(token);
  } else {
    console.log("No valid token received");
  }
}

async function createUser() {
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
              firstName: "Test",
              lastName: "User",
              email: "test@example.com",
              password: "userpassword",
            },
          },
        }),
      }
    );
    const { data: user, errors } = await response.json();
    console.log("keygen user response", user);
    console.log("keygen errors", errors);

    if (errors) {
      throw new Error(errors.map((e) => e.detail).toString());
    }
  } catch (error) {
    console.error("Error creating Keygen user:", error);
  }
}

async function retrieveLicense(token) {
  const response = await fetch(
    `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/licenses`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const { data: license, errors } = await response.json();
  console.log("keygen license response", license);
  console.log("keygen errors", errors);
}

async function authenticateUser() {
  const credentials = btoa(`test@example.com:userpassword`);

  const response = await fetch(
    `https://api.keygen.sh/v1/accounts/${process.env.KEYGEN_ACCOUNT_ID}/tokens`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
        Authorization: `Basic ${credentials}`,
      },
    }
  );
  console.log("RESPONSE STATUS:", response.status);
  const { data, errors } = await response.json();
  console.log("DATA:", data);
  console.log("ERRORS:", errors);
  console.log("TOKEN:", data.attributes.token);

  return data.attributes.token; // Return the token data, not the response object
}

main();
