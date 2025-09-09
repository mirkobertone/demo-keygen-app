import { createContext } from "react";

// Define types locally to avoid import issues
export type User = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
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
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
