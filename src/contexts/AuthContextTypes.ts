import { createContext } from "react";

// Define types locally to avoid import issues
export type User = {
  id: string;
  aud: string;
  role: string;
  email: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    email: string;
    email_verified: boolean;
    phone_verified: boolean;
    sub: string;
  };
  identities: Array<{
    identity_id: string;
    id: string;
    user_id: string;
    identity_data: {
      email: string;
      email_verified: boolean;
      phone_verified: boolean;
      sub: string;
    };
    provider: string;
    last_sign_in_at: string;
    created_at: string;
    updated_at: string;
    email: string;
  }>;
  created_at: string;
  updated_at: string;
  is_anonymous: boolean;
};

export type Profile = {
  id: string;
  email: string;
  stripe_customer_id: string;
  keygen_user_id: string;
  created_at: string;
  updated_at: string;
};

export type Session = {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: User;
  weak_password: null;
};

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: { message: string } | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
  getKeygenUserId: () => string | null;
  makeAuthenticatedRequest: (
    url: string,
    options?: RequestInit
  ) => Promise<Response>;
  fetchLicenses: () => Promise<
    Array<{
      id: string;
      name: string;
      key: string;
      status: string;
      created: string;
      updated: string;
    }>
  >;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
