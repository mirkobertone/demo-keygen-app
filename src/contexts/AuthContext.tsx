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
  console.log("API_BASE_URL:", API_BASE_URL);

  // Helper function to get auth token from localStorage
  const getAuthToken = useCallback(() => {
    return localStorage.getItem("auth_token");
  }, []);

  // Helper function to set auth token in localStorage
  const setAuthToken = useCallback((token: string) => {
    localStorage.setItem("auth_token", token);
  }, []);

  // Helper function to set user data in localStorage
  const setUserData = useCallback((userData: User) => {
    localStorage.setItem("user_data", JSON.stringify(userData));
  }, []);

  // Helper function to get user data from localStorage
  const getUserData = useCallback(() => {
    const userData = localStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  }, []);

  // Helper function to remove user data from localStorage
  const removeUserData = useCallback(() => {
    localStorage.removeItem("user_data");
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

  // Helper function to set custom token in localStorage
  const setCustomToken = useCallback((token: string) => {
    localStorage.setItem("custom_token", token);
  }, []);

  // Helper function to get custom token from localStorage
  const getCustomToken = useCallback(() => {
    return localStorage.getItem("custom_token");
  }, []);

  // Helper function to remove custom token from localStorage
  const removeCustomToken = useCallback(() => {
    localStorage.removeItem("custom_token");
  }, []);

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = getAuthToken();
      console.log(
        "makeAuthenticatedRequest - token:",
        token ? "exists" : "null"
      );
      console.log("makeAuthenticatedRequest - url:", url);

      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      console.log("makeAuthenticatedRequest - headers:", headers);

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
      const storedUserData = getUserData();
      console.log("checkAuthStatus - token:", token ? "exists" : "null");
      console.log(
        "checkAuthStatus - storedUserData:",
        storedUserData ? "exists" : "null"
      );

      if (!token || !storedUserData) {
        // No token or user data, user is not authenticated
        setLoading(false);
        return;
      }

      try {
        // Extract keygenUserId from the stored token if not already in user data
        let keygenUserId = storedUserData.keygenUserId;
        if (!keygenUserId && token) {
          const decodedToken = decodeJWT(token);
          if (decodedToken && decodedToken.keygenUserId) {
            keygenUserId = decodedToken.keygenUserId;
            console.log(
              "Extracted keygenUserId from stored token:",
              keygenUserId
            );

            // Update stored user data with keygenUserId
            const updatedUserData = {
              ...storedUserData,
              keygenUserId: keygenUserId,
            };
            setUserData(updatedUserData);
            setUser(updatedUserData);
          }
        } else {
          setUser(storedUserData);
        }

        // Create session from stored data
        setSession({
          user: storedUserData,
          access_token: token,
          refresh_token: "",
          token_type: "Bearer",
        });

        console.log("Auth check successful, restored user from localStorage");
      } catch (error) {
        console.error("Auth check failed:", error);
        removeAuthToken();
        removeKeygenToken();
        removeCustomToken();
        removeUserData();
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [
    getAuthToken,
    getUserData,
    setUserData,
    removeAuthToken,
    removeKeygenToken,
    removeCustomToken,
    removeUserData,
  ]);

  const signUp = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
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

  // Helper function to decode JWT token
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signin`, {
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
      console.log(
        "Signin successful - session.access_token:",
        data.session?.access_token ? "exists" : "null"
      );
      console.log(
        "Signin successful - keygenToken:",
        data.keygenToken ? "exists" : "null"
      );

      // Use session.access_token for authenticated requests
      setAuthToken(data.session.access_token);
      if (data.keygenToken) {
        setKeygenToken(data.keygenToken);
      }

      // Store the custom token
      if (data.token) {
        setCustomToken(data.token);
      }

      // Extract keygenUserId from the custom token
      let keygenUserId = null;
      if (data.token) {
        const decodedToken = decodeJWT(data.token);
        if (decodedToken && decodedToken.keygenUserId) {
          keygenUserId = decodedToken.keygenUserId;
          console.log(
            "Extracted keygenUserId from custom token:",
            keygenUserId
          );
        }
      }

      // Create user object with keygenUserId
      const userWithKeygenId = {
        ...data.user,
        keygenUserId: keygenUserId,
      };

      setUser(userWithKeygenId);
      setUserData(userWithKeygenId);
      setSession(data.session);

      return { error: null };
    } catch {
      return { error: { message: "Network error" } };
    }
  };

  const signOut = async () => {
    try {
      await makeAuthenticatedRequest(`${API_BASE_URL}/signout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Signout error:", error);
    } finally {
      // Always clear local state and tokens
      removeAuthToken();
      removeKeygenToken();
      removeCustomToken();
      removeUserData();
      setUser(null);
      setSession(null);
    }
  };

  const getKeygenUserId = () => {
    return user?.keygenUserId || user?.user_metadata?.keygen_user_id || null;
  };

  const getKeygenTokenValue = () => {
    return getKeygenToken();
  };

  // Call the whoami API to get user metadata and licenses
  const fetchUserInfo = async () => {
    const token = getAuthToken();
    const keygenToken = getKeygenToken();
    const keygenUserId = getKeygenUserId();

    if (!token || !keygenToken || !keygenUserId) {
      throw new Error("Missing authentication tokens or user ID");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/whoami`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          keygenToken: keygenToken,
          userId: keygenUserId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw error;
    }
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
    getCustomToken,
    makeAuthenticatedRequest,
    fetchUserInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
