# Demo Keygen App

A modern React application with Supabase authentication, built with Vite and TypeScript.

## Features

- 🔐 **Authentication**: Sign up, sign in, and sign out functionality
- 🛡️ **Protected Routes**: Dashboard accessible only to authenticated users
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- ⚡ **Fast Development**: Built with Vite for lightning-fast development
- 🔒 **Secure**: Powered by Supabase for secure authentication

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Authentication**: Supabase
- **Routing**: React Router DOM
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm
- A Supabase account

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd demo-keygen-app
pnpm install
```

### 2. Set up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to **Settings** > **API**
3. Copy your project URL and anon key
4. Create a `.env.local` file in the root directory:

```bash
cp env.example .env.local
```

5. Update `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Configure Supabase Authentication

In your Supabase dashboard:

1. Go to **Authentication** > **Settings**
2. Under **Site URL**, add: `http://localhost:5173`
3. Under **Redirect URLs**, add: `http://localhost:5173/dashboard`
4. Enable **Email** authentication in **Authentication** > **Providers**

### 4. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

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

## Available Routes

- `/` - Redirects to dashboard if authenticated, otherwise to sign in
- `/signin` - Sign in page
- `/signup` - Sign up page
- `/dashboard` - Protected dashboard (requires authentication)

## Authentication Flow

1. **Sign Up**: Users can create new accounts with email and password
2. **Email Confirmation**: Supabase sends a confirmation email (if enabled)
3. **Sign In**: Users can sign in with their credentials
4. **Protected Routes**: Authenticated users can access the dashboard
5. **Sign Out**: Users can sign out from the dashboard

## Environment Variables

| Variable                 | Description                 |
| ------------------------ | --------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL   |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

### Adding New Features

1. Create new components in the `src/components/` directory
2. Add new pages in the `src/pages/` directory
3. Update routing in `src/App.tsx`
4. Use the `useAuth` hook to access authentication state

## Deployment

1. Build the project: `pnpm build`
2. Deploy the `dist` folder to your hosting provider
3. Update your Supabase site URL and redirect URLs to match your production domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
