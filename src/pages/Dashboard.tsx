import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

const Dashboard: React.FC = () => {
  const {
    user,
    signOut,
    getKeygenUserId,
    makeAuthenticatedRequest,
    fetchUserInfo,
  } = useAuth();
  const [licenses, setLicenses] = useState<unknown[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID; // Assuming you have a default price ID for subscription

  const fetchUserInfoData = useCallback(async () => {
    setLoadingLicenses(true);
    try {
      const data = await fetchUserInfo();
      console.log("User info API response:", data);

      // Extract and set licenses
      const licensesArray = data.licenses || [];
      console.log("Processed licenses array:", licensesArray);
      setLicenses(licensesArray);

      // Extract metadata
      if (data.user?.attributes?.metadata) {
        const metadata = data.user.attributes.metadata;
        if (metadata.stripeCustomerId) {
          setStripeCustomerId(metadata.stripeCustomerId);
        }
        if (metadata.supabaseUserId) {
          setSupabaseUserId(metadata.supabaseUserId);
        }
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      setLicenses([]); // Ensure licenses is always an array
    } finally {
      setLoadingLicenses(false);
    }
  }, [fetchUserInfo]);

  useEffect(() => {
    if (user) {
      const keygenUserId = getKeygenUserId();
      if (keygenUserId) {
        fetchUserInfoData();
      } else {
        console.log("No Keygen user ID found in metadata");
      }
    }

    // Check for successful payment return from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const canceled = urlParams.get("canceled");

    if (sessionId) {
      // Payment was successful, refresh user info
      setCheckoutSuccess(
        "Payment successful! Your license is being processed..."
      );
      if (user) {
        const keygenUserId = getKeygenUserId();
        if (keygenUserId) {
          fetchUserInfoData();
        }
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled) {
      setCheckoutError(
        "Payment was canceled. Please try again if you wish to subscribe."
      );
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, getKeygenUserId, fetchUserInfoData]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSubscribe = async () => {
    setCheckoutError(null);
    setCheckoutSuccess(null);
    if (!user || !user.email) {
      setCheckoutError("User email not available for subscription.");
      return;
    }

    if (!STRIPE_PRICE_ID) {
      setCheckoutError("Stripe Price ID is not configured.");
      console.error(
        "VITE_STRIPE_PRICE_ID is not set in environment variables."
      );
      return;
    }

    // Get Stripe customer ID from user metadata
    const stripeCustomerId = user.user_metadata?.stripe_customer_id;
    if (!stripeCustomerId) {
      setCheckoutError("Stripe customer ID not found. Please contact support.");
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${BACKEND_URL}/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId: STRIPE_PRICE_ID,
            customerEmail: user.email,
            stripeCustomerId: stripeCustomerId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (error: unknown) {
      console.error("Error initiating Stripe Checkout:", error);
      setCheckoutError(
        error instanceof Error ? error.message : "An error occurred"
      );
    }
  };

  const handleManageSubscription = async () => {
    setCheckoutError(null);
    setCheckoutSuccess(null);
    if (!stripeCustomerId) {
      setCheckoutError("Stripe Customer ID not found.");
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${BACKEND_URL}/create-customer-portal-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stripeCustomerId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create customer portal session"
        );
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe Customer Portal
    } catch (error: unknown) {
      console.error("Error initiating Stripe Customer Portal:", error);
      setCheckoutError(
        error instanceof Error ? error.message : "An error occurred"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">
                <span className="text-indigo-600">Keygen</span> App
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-md font-medium text-gray-700">
                Welcome, <span className="text-indigo-600">{user?.email}</span>
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Information Card */}
          <div className="md:col-span-1 bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                User Profile
              </h3>
            </div>
            <div className="px-6 py-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Email address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 break-words">
                    {user?.email}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">
                    {user?.id}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Account Created
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Last Sign In
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : "N/A"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Keygen User ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">
                    {getKeygenUserId() || "Not available"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Supabase User ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">
                    {supabaseUserId || "Not available"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Stripe Customer ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">
                    {stripeCustomerId || "Not available"}
                  </dd>
                </div>
              </dl>
              {stripeCustomerId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleManageSubscription}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                  >
                    Manage Subscription
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2 bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Your Dashboard
              </h3>
            </div>
            <div className="px-6 py-6 text-center">
              {loadingLicenses ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Loading licenses...
                  </p>
                </div>
              ) : licenses && licenses.length > 0 ? (
                <div className="text-left">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Your Licenses
                  </h3>
                  <ul className="divide-y divide-gray-200">
                    {licenses &&
                      licenses.map((license) => {
                        const licenseData = license as {
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
                        };
                        return (
                          <li
                            key={licenseData.id}
                            className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-start"
                          >
                            <div className="mb-2 sm:mb-0 flex-1">
                              <p className="text-sm font-medium text-indigo-600">
                                {licenseData.attributes.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Key: {licenseData.attributes.key}
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div>
                                  <span className="font-medium">Status:</span>{" "}
                                  {licenseData.attributes.status}
                                </div>
                                <div>
                                  <span className="font-medium">Uses:</span>{" "}
                                  {licenseData.attributes.uses}
                                  {licenseData.attributes.maxUses &&
                                    ` / ${licenseData.attributes.maxUses}`}
                                </div>
                                <div>
                                  <span className="font-medium">Type:</span>{" "}
                                  {licenseData.attributes.floating
                                    ? "Floating"
                                    : "Fixed"}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Protected:
                                  </span>{" "}
                                  {licenseData.attributes.protected
                                    ? "Yes"
                                    : "No"}
                                </div>
                                {licenseData.attributes.expiry && (
                                  <div className="col-span-2">
                                    <span className="font-medium">
                                      Expires:
                                    </span>{" "}
                                    {new Date(
                                      licenseData.attributes.expiry
                                    ).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                licenseData.attributes.status === "ACTIVE"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {licenseData.attributes.status}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ) : (
                <>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No licenses found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by subscribing to a plan and generating a key.
                  </p>
                  <div className="mt-6">
                    {checkoutError && (
                      <div className="rounded-md bg-red-50 p-4 mb-4">
                        <div className="text-sm text-red-700 font-medium">
                          {checkoutError}
                        </div>
                      </div>
                    )}
                    {checkoutSuccess && (
                      <div className="rounded-md bg-green-50 p-4 mb-4">
                        <div className="text-sm text-green-700 font-medium">
                          {checkoutSuccess}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleSubscribe}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                    >
                      Subscribe to a Plan
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
