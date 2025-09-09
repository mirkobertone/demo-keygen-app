require("dotenv").config();

async function authenticateUser(username, password) {
  const credentials = btoa(`${username}:${password}`);

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

  if (errors && errors.length > 0) {
    throw new Error(`Keygen authentication failed: ${errors[0].detail}`);
  }

  if (!data || !data.attributes || !data.attributes.token) {
    throw new Error("Invalid response from Keygen API");
  }

  console.log("TOKEN:", data.attributes.token);
  return data.attributes.token; // Return the token data, not the response object
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
async function createAccount(email, password, supabaseUserId) {
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
            email,
            password,
            metadata: {
              supabaseUserId: supabaseUserId,
            },
          },
        },
      }),
    }
  );
  const { data: user, errors } = await response.json();
  console.log("keygen user response", user);
  console.log("keygen errors", errors);
  return user;
}
module.exports = { authenticateUser, retrieveLicense, createAccount };
