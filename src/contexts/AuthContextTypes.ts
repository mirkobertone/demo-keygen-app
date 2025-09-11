import { createContext } from "react";

// Define types locally to avoid import issues
export type User = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  keygenUserId?: string;
  user_metadata?: {
    keygen_user_id?: string;
    [key: string]: unknown;
  };
};

export type Session = {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type: string;
};

export interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  getKeygenToken: () => string | null;
  getCustomToken: () => string | null;
  makeAuthenticatedRequest: (
    url: string,
    options?: RequestInit
  ) => Promise<Response>;
  fetchUserInfo: () => Promise<{
    user: {
      id: string;
      attributes: {
        metadata: {
          supabaseUserId: string;
          stripeCustomerId: string;
        };
      };
    };
    licenses: Array<{
      id: string;
      attributes: {
        name: string;
        key: string;
        status: string;
        expiry: string | null;
        uses: number;
        maxUses: number | null;
        floating: boolean;
        protected: boolean;
      };
    }>;
  }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
