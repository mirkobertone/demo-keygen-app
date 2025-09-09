import React, { useEffect, useState, useCallback } from "react";
import { AuthContext, type User, type Session } from "./AuthContextTypes";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  // Helper function to get auth token from localStorage
  const getAuthToken = useCallback(() => {
    return localStorage.getItem("auth_token");
  }, []);

  // Helper function to set auth token in localStorage
  const setAuthToken = useCallback((token: string) => {
    localStorage.setItem("auth_token", token);
  }, []);

  // Helper function to set keygen token in localStorage
  const setKeygenToken = useCallback((token: string) => {
    localStorage.setItem("keygen_token", token);
  }, []);

  // Helper function to get keygen token from localStorage
  const getKeygenToken = useCallback(() => {
    return localStorage.getItem("keygen_token");
  }, []);

  // Helper function to remove keygen token from localStorage
  const removeKeygenToken = useCallback(() => {
    localStorage.removeItem("keygen_token");
  }, []);

  // Helper function to remove auth token from localStorage
  const removeAuthToken = useCallback(() => {
    localStorage.removeItem("auth_token");
  }, []);

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = getAuthToken();
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [getAuthToken]
  );

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuthStatus = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await makeAuthenticatedRequest(
            `${API_BASE_URL}/auth/user`
          );
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setSession({
              user: data.user,
              access_token: token,
              refresh_token: "",
              token_type: "Bearer",
            });
          } else {
            // Token is invalid, remove it
            removeAuthToken();
            removeKeygenToken();
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          removeAuthToken();
          removeKeygenToken();
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [
    API_BASE_URL,
    makeAuthenticatedRequest,
    getAuthToken,
    removeAuthToken,
    removeKeygenToken,
  ]);

  const signUp = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error } };
      }

      return { error: null };
    } catch {
      return { error: { message: "Network error" } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error } };
      }

      // Store the tokens and update state
      setAuthToken(data.token);
      if (data.keygenToken) {
        setKeygenToken(data.keygenToken);
      }
      setUser(data.user);
      setSession(data.session);

      return { error: null };
    } catch {
      return { error: { message: "Network error" } };
    }
  };

  const signOut = async () => {
    try {
      await makeAuthenticatedRequest(`${API_BASE_URL}/auth/signout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Signout error:", error);
    } finally {
      // Always clear local state and tokens
      removeAuthToken();
      removeKeygenToken();
      setUser(null);
      setSession(null);
    }
  };

  const getKeygenUserId = () => {
    return user?.user_metadata?.keygen_user_id || null;
  };

  const getKeygenTokenValue = () => {
    return getKeygenToken();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    getKeygenUserId,
    getKeygenToken: getKeygenTokenValue,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
