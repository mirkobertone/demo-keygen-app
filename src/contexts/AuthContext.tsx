import React, { useEffect, useState, useCallback } from "react";
import {
  AuthContext,
  type User,
  type Session,
  type Profile,
} from "./AuthContextTypes";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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

  // Helper function to remove auth token from localStorage
  const removeAuthToken = useCallback(() => {
    localStorage.removeItem("auth_token");
  }, []);

  // Helper function to set profile data in localStorage
  const setProfileData = useCallback((profileData: Profile) => {
    localStorage.setItem("profile_data", JSON.stringify(profileData));
  }, []);

  // Helper function to get profile data from localStorage
  const getProfileData = useCallback(() => {
    const profileData = localStorage.getItem("profile_data");
    return profileData ? JSON.parse(profileData) : null;
  }, []);

  // Helper function to remove profile data from localStorage
  const removeProfileData = useCallback(() => {
    localStorage.removeItem("profile_data");
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
      const storedProfileData = getProfileData();
      console.log("checkAuthStatus - token:", token ? "exists" : "null");
      console.log(
        "checkAuthStatus - storedUserData:",
        storedUserData ? "exists" : "null"
      );
      console.log(
        "checkAuthStatus - storedProfileData:",
        storedProfileData ? "exists" : "null"
      );

      if (!token || !storedUserData) {
        // No token or user data, user is not authenticated
        setLoading(false);
        return;
      }

      try {
        setUser(storedUserData);
        setProfile(storedProfileData);

        // Create session from stored data
        setSession({
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Date.now() + 3600000, // 1 hour from now
          refresh_token: "",
          user: storedUserData,
          weak_password: null,
        });

        console.log("Auth check successful, restored user from localStorage");
      } catch (error) {
        console.error("Auth check failed:", error);
        removeAuthToken();
        removeUserData();
        removeProfileData();
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [
    getAuthToken,
    getUserData,
    getProfileData,
    removeAuthToken,
    removeUserData,
    removeProfileData,
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
        "Signin successful - profile:",
        data.profile ? "exists" : "null"
      );

      // Use session.access_token for authenticated requests
      setAuthToken(data.session.access_token);

      // Store user, session, and profile data
      setUser(data.user);
      setUserData(data.user);
      setProfile(data.profile);
      setProfileData(data.profile);
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
      removeUserData();
      removeProfileData();
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const getKeygenUserId = () => {
    return profile?.keygen_user_id || null;
  };

  // Call the licenses API to get user licenses
  const fetchLicenses = async () => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Missing authentication token");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/licenses`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch licenses: ${response.statusText}`);
      }

      const data = await response.json();
      return data.licenses || [];
    } catch (error) {
      console.error("Error fetching licenses:", error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    getKeygenUserId,
    makeAuthenticatedRequest,
    fetchLicenses,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
