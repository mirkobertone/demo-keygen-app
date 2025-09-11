import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

const Dashboard: React.FC = () => {
  const {
    user,
    profile,
    signOut,
    getKeygenUserId,
    makeAuthenticatedRequest,
    fetchLicenses,
  } = useAuth();
  const [licenses, setLicenses] = useState<unknown[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID; // Assuming you have a default price ID for subscription

  const fetchLicensesData = useCallback(async () => {
    setLoadingLicenses(true);
    try {
      const licensesArray = await fetchLicenses();
      console.log("Licenses API response:", licensesArray);
      setLicenses(licensesArray);

      // Set Stripe customer ID from profile
      if (profile?.stripe_customer_id) {
        setStripeCustomerId(profile.stripe_customer_id);
      }
    } catch (error) {
      console.error("Error fetching licenses:", error);
      setLicenses([]); // Ensure licenses is always an array
    } finally {
      setLoadingLicenses(false);
    }
  }, [fetchLicenses, profile]);

  useEffect(() => {
    if (user && profile) {
      fetchLicensesData();
    }

    // Check for successful payment return from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const canceled = urlParams.get("canceled");

    if (sessionId) {
      // Payment was successful, refresh licenses
      setCheckoutSuccess(
        "Payment successful! Your license is being processed..."
      );
      if (user && profile) {
        fetchLicensesData();
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
  }, [user, profile, fetchLicensesData]);

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

    // Get Stripe customer ID from the profile
    if (!profile?.stripe_customer_id) {
      setCheckoutError("Stripe customer ID not found. Please contact support.");
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${BACKEND_URL}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId: STRIPE_PRICE_ID,
            customerEmail: user.email,
            stripeCustomerId: profile.stripe_customer_id,
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
    if (!profile?.stripe_customer_id) {
      setCheckoutError("Stripe Customer ID not found.");
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${BACKEND_URL}/customer-portal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stripeCustomerId: profile.stripe_customer_id,
            returnUrl: `${window.location.origin}/dashboard`,
          }),
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

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    try {
      const response = await makeAuthenticatedRequest(
        `${BACKEND_URL}/delete-account`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete account");
      }

      // Account deleted successfully, sign out and redirect
      await signOut();
      window.location.href = "/";
    } catch (error: unknown) {
      console.error("Error deleting account:", error);
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting your account"
      );
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
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
                    Stripe Customer ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">
                    {profile?.stripe_customer_id || "Not available"}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                {profile?.stripe_customer_id && (
                  <button
                    type="button"
                    onClick={handleManageSubscription}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                  >
                    Manage Subscription
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
                >
                  Delete Account
                </button>
              </div>
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
                          name: string;
                          key: string;
                          status: string;
                          created: string;
                          updated: string;
                        };
                        return (
                          <li
                            key={licenseData.id}
                            className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-start"
                          >
                            <div className="mb-2 sm:mb-0 flex-1">
                              <p className="text-sm font-medium text-indigo-600">
                                {licenseData.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Key: {licenseData.key}
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div>
                                  <span className="font-medium">Status:</span>{" "}
                                  {licenseData.status}
                                </div>
                                <div>
                                  <span className="font-medium">Created:</span>{" "}
                                  {new Date(
                                    licenseData.created
                                  ).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="font-medium">Updated:</span>{" "}
                                  {new Date(
                                    licenseData.updated
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                licenseData.status === "ACTIVE"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {licenseData.status}
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

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Delete Account
              </h3>
              <p className="text-gray-600 text-center mb-6 leading-relaxed">
                This action cannot be undone. This will permanently delete your
                account and remove all your data, licenses, and subscription
                information from our servers.
              </p>

              {/* Warning Box */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">
                      Warning
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      All your licenses, subscription data, and account
                      information will be permanently lost.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    "Delete Account"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
