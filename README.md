## Demo Keygen App

A modern React frontend application with Supabase authentication, integrated with a Node.js backend for Keygen and Stripe payment processing. This implementation is based on the [Keygen-Stripe integration example](https://github.com/keygen-sh/example-stripe-integration) and provides a complete solution for automated license generation upon successful payments.

Built with Vite and TypeScript.

## Features

- 🔐 **Authentication**: Sign up, sign in, and sign out functionality using Supabase.
- 🛡️ **Protected Routes**: Dashboard accessible only to authenticated users.
- 💳 **Stripe Integration**: Initiate Stripe Checkout for subscriptions.
- 🔑 **Keygen Integration**: Create users and licenses in Keygen upon successful Stripe payments.
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS.
- ⚡ **Fast Development**: Built with Vite for lightning-fast frontend development.
- 🔒 **Secure**: Supabase for secure authentication, Stripe for payments, and Keygen for licensing.
- 🔄 **Webhook Integration**: Automated license creation via Stripe webhooks.
- 💼 **Customer Portal**: Manage subscriptions through Stripe Customer Portal.
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Tech Stack

### Frontend

- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Authentication**: Supabase
- **Routing**: React Router DOM

### Backend

- **Runtime**: Node.js
- **Framework**: Express
- **Payments**: Stripe API
- **Licensing**: Keygen API (via Axios)
- **Environment**: Dotenv
- **Utilities**: CORS

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm
- A Supabase account
- A Stripe account
- A Keygen account
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local webhook testing)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd demo-keygen-app
```

### 2. Frontend Setup

#### 2.1. Install Frontend Dependencies

```bash
pnpm install
```

#### 2.2. Configure Frontend Environment Variables

1.  Create a `.env.local` file in the frontend root directory (`/home/mirkuz/dev/demo-keygen-app/`):

    ```bash
    cp env.example .env.local
    ```

2.  Update `.env.local` with your Supabase, Backend, and Stripe Publishable credentials:

    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_BACKEND_URL=http://localhost:8080 # Or your deployed backend URL
    VITE_STRIPE_PRICE_ID=price_xxxxxxxxxxxxxxxxx # Your Stripe Price ID for a subscription plan
    ```

#### 2.3. Configure Supabase Authentication

In your Supabase dashboard:

1.  Go to **Authentication** > **Settings**
2.  Under **Site URL**, add: `http://localhost:5173`
3.  Under **Redirect URLs**, add: `http://localhost:5173/dashboard`
4.  Enable **Email** authentication in **Authentication** > **Providers**

### 3. Backend Setup

#### 3.1. Install Backend Dependencies

```bash
cd backend
pnpm install
cd ..
```

#### 3.2. Configure Backend Environment Variables

1.  Create a `.env` file in the backend directory (`/home/mirkuz/dev/demo-keygen-app/backend/`):

    ```bash
    cp backend/env.example backend/.env
    ```

2.  Update `backend/.env` with your Stripe and Keygen API keys:

    ```env
    STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
    STRIPE_SECRET_KEY=your_stripe_secret_key
    STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret # Get this from Stripe webhook setup

    KEYGEN_PRODUCT_TOKEN=your_keygen_product_token # Starts with `prod-` or `admi-`
    KEYGEN_ACCOUNT_ID=your_keygen_account_id # Your Keygen account UUID
    KEYGEN_POLICY_ID=your_keygen_policy_id # The policy UUID for new licenses

    FRONTEND_URL=http://localhost:5173
    PORT=8080
    ```

#### 3.3. Configure Webhooks (Local Development with Stripe CLI)

For local development, you need the Stripe CLI to forward webhook events to your local backend server.

1.  Start your backend server (after step 4.2):

    ```bash
    cd backend
    pnpm start
    cd ..
    ```

2.  In a **new terminal window**, start the Stripe CLI to listen for webhooks and forward them to your backend. Make sure to replace `whsec_xxx` with your actual webhook secret (which the Stripe CLI will provide):

    ```bash
    stripe listen --forward-to localhost:8080/stripe-webhooks
    ```

3.  The Stripe CLI will output a `Webhook secret` (e.g., `whsec_...`). Copy this secret and update the `STRIPE_WEBHOOK_SECRET` variable in your `backend/.env` file.

4.  Once the Stripe CLI is running, it will act as the intermediary for Stripe webhooks. You do **not** need to configure a webhook URL in your Stripe Dashboard for local development when using `stripe listen` in this manner.

    - **Keygen Webhook**: (Optional, if you plan to use Keygen webhooks) If you plan to use Keygen webhooks for local development, you would still need `ngrok` to expose your backend for Keygen webhooks. Add `https://{YOUR_NGROK_URL}/keygen-webhooks` to your Keygen Dashboard ([https://app.keygen.sh/webhook-endpoints](https://app.keygen.sh/webhook-endpoints)). _Note: This example does not currently implement Keygen webhook handling, but the endpoint is provided for future extension._

## Project Structure

```
src/
├── components/
│   └── ProtectedRoute.tsx    # Route protection component
├── contexts/
│   └── AuthContext.tsx       # Authentication context and provider
├── lib/
│   └── supabase.ts          # Supabase client configuration
├── pages/
│   ├── SignIn.tsx           # Sign in page
│   ├── SignUp.tsx           # Sign up page
│   └── Dashboard.tsx        # Authenticated user dashboard
├── App.tsx                  # Main app component with routing
└── main.tsx                 # App entry point
```

```
backend/
├── index.js                 # Backend server with Stripe and Keygen integrations
├── package.json             # Backend dependencies
└── env.example              # Backend environment variables example
```

## Available Routes

### Frontend Routes

- `/` - Redirects to dashboard if authenticated, otherwise to sign in
- `/signin` - Sign in page
- `/signup` - Sign up page
- `/dashboard` - Protected dashboard (requires authentication)

### Backend Routes

- `GET /` - Serves a simple purchase form (similar to the reference example)
- `POST /create-checkout-session` - Creates a new Stripe Checkout session
- `POST /stripe-webhooks` - Handles Stripe webhook events (e.g., `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`)
- `POST /keygen-webhooks` - Handles Keygen webhook events (e.g., `license.created`, `license.validated`, `license.invalidated`)
- `GET /api/v1/licenses/:userId` - (Proxy) Fetches Keygen licenses for a specific user, including Stripe Customer ID from Keygen user metadata
- `POST /create-customer-portal-session` - Creates a new Stripe Customer Portal session URL for subscription management

## Authentication Flow

1. **Sign Up**: Users create new accounts with email and password via Supabase.
2. **Email Confirmation**: Supabase sends a confirmation email (if enabled).
3. **Sign In**: Users sign in with their credentials via Supabase.
4. **Protected Routes**: Authenticated users can access the dashboard.
5. **Subscription**: From the dashboard, users can subscribe to a plan via Stripe Checkout, which is initiated by the Node.js backend.
6. **Keygen License Creation**: Upon successful Stripe payment (handled by a Stripe webhook), the backend creates a corresponding user and license in Keygen, and stores the Stripe Customer ID in the Keygen user's metadata.
7. **View Licenses**: Authenticated users can view their Keygen licenses on the dashboard (fetched via a backend proxy).
8. **Manage Subscription**: If a Stripe Customer ID is associated with their Keygen user, authenticated users can access the Stripe Customer Portal from the dashboard to manage their subscriptions and billing details.

## Integration Flow

This application implements the complete Keygen-Stripe integration flow as demonstrated in the [reference example](https://github.com/keygen-sh/example-stripe-integration):

### 1. Payment Processing

- User initiates subscription through the dashboard or backend purchase form
- Backend creates a Stripe Checkout session
- User completes payment on Stripe's secure checkout page

### 2. Automated License Creation

- Stripe sends `checkout.session.completed` webhook to backend
- Backend automatically creates a user in Keygen with Stripe metadata
- Backend creates a license in Keygen associated with the new user
- License includes Stripe Customer ID and Subscription ID in metadata

### 3. License Management

- Users can view their licenses on the dashboard
- Licenses are fetched from Keygen via backend proxy
- Stripe Customer ID is extracted from Keygen user metadata

### 4. Subscription Management

- Users can access Stripe Customer Portal to manage billing
- Webhook handlers for subscription changes (deletion, payment failures, etc.)
- Future enhancements can include license revocation on subscription cancellation

## Webhook Configuration

### Stripe Webhooks (Required)

Configure these webhook events in your Stripe Dashboard:

- `checkout.session.completed` - Creates Keygen user and license
- `customer.subscription.deleted` - (Optional) Handle subscription cancellation
- `invoice.payment_failed` - (Optional) Handle payment failures
- `invoice.payment_succeeded` - (Optional) Handle successful payments after failures

### Keygen Webhooks (Optional)

Configure these webhook events in your Keygen Dashboard:

- `license.created` - Handle new license creation
- `license.validated` - Handle license validation events
- `license.invalidated` - Handle license invalidation events

### Local Development Setup

For local development, use the Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:8080/stripe-webhooks
```

For production, configure webhook endpoints in both Stripe and Keygen dashboards pointing to your deployed backend.

## Environment Variables

### Frontend Environment Variables

| Variable                      | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `VITE_SUPABASE_URL`           | Your Supabase project URL                           |
| `VITE_SUPABASE_ANON_KEY`      | Your Supabase anonymous key                         |
| `VITE_BACKEND_URL`            | Backend server URL (default: http://localhost:8080) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key                         |
| `VITE_STRIPE_PRICE_ID`        | Your Stripe price ID for subscriptions              |

### Backend Environment Variables

| Variable                 | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key                                |
| `STRIPE_SECRET_KEY`      | Your Stripe secret key                                     |
| `STRIPE_WEBHOOK_SECRET`  | Your Stripe webhook secret                                 |
| `STRIPE_PLAN_ID`         | Your Stripe plan ID                                        |
| `KEYGEN_PRODUCT_TOKEN`   | Your Keygen product token (starts with `prod-` or `admi-`) |
| `KEYGEN_ACCOUNT_ID`      | Your Keygen account ID (UUID)                              |
| `KEYGEN_POLICY_ID`       | Your Keygen policy ID (UUID)                               |
| `FRONTEND_URL`           | Frontend URL (default: http://localhost:5173)              |
| `PORT`                   | Backend server port (default: 8080)                        |

## Troubleshooting

### Common Issues

#### 1. Incorrect Environment Variables

- Double-check all environment variables are correctly set
- Ensure Stripe keys are from the same environment (test/live)
- Verify Keygen account ID and policy ID are correct UUIDs

#### 2. Protected Keygen Account

- This example requires your Keygen account to be set to **unprotected**
- Update this setting in your Keygen account settings
- If you prefer to keep it protected, move user creation logic to server-side

#### 3. Webhook Issues

- Ensure webhook endpoints are accessible from the internet
- For local development, use `ngrok` or Stripe CLI
- Check webhook secret is correctly configured
- Verify webhook events are enabled in Stripe Dashboard

#### 4. CORS Issues

- Ensure frontend URL is correctly configured in backend CORS settings
- Check that `VITE_BACKEND_URL` matches your backend server URL

#### 5. License Not Appearing

- Check webhook logs for errors
- Verify Keygen user creation was successful
- Ensure license creation completed without errors
- Check that user ID matches between Supabase and Keygen

### Testing the Integration

1. **Test Payment Flow**:

   - Use Stripe test cards (e.g., `4242 4242 4242 4242`)
   - Check webhook logs for successful processing
   - Verify license appears in Keygen dashboard

2. **Test Webhook Processing**:

   - Use Stripe CLI to forward webhooks locally
   - Check backend logs for webhook events
   - Verify Keygen API calls are successful

3. **Test License Retrieval**:
   - Check that licenses appear on dashboard
   - Verify Stripe Customer ID is stored in metadata
   - Test Customer Portal access

## Production Deployment

### Security Considerations

- Use environment-specific API keys
- Enable webhook signature verification
- Implement proper error handling and logging
- Use HTTPS for all webhook endpoints
- Consider rate limiting for API endpoints

### Scaling Considerations

- Implement database storage for user-license relationships
- Add retry logic for failed webhook processing
- Consider queue-based processing for high volume
- Implement proper monitoring and alerting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with both Stripe and Keygen
5. Submit a pull request

## Development

### Frontend Scripts

- `pnpm dev` - Start frontend development server
- `pnpm build` - Build frontend for production
- `pnpm preview` - Preview frontend production build
- `pnpm lint` - Run ESLint on frontend

### Backend Scripts

- To start the backend server, run `node index.js` or define a `start` script in `backend/package.json`.
  For example, add to `backend/package.json`:
  ```json
  "scripts": {
    "start": "node index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
  ```
  Then run `cd backend && pnpm start`.

### Adding New Features

1. Create new components in the `src/components/` directory
2. Add new pages in the `src/pages/` directory
3. Update routing in `src/App.tsx`
4. Use the `useAuth` hook to access authentication state

## Deployment

1. Build the project: `pnpm build`
2. Deploy the `dist` folder to your hosting provider
3. Update your Supabase site URL and redirect URLs to match your production domain

## License

MIT License - see LICENSE file for details.
