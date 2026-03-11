import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { resolveShop } from "@lib/use-shop";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string>("Starter Plan");
  const [plans, setPlans] = useState<Record<string, { name: string; price: number; features: string[] }>>({});

  useEffect(() => {
    fetchBillingSettings();
  }, []);

  const fetchBillingSettings = async () => {
    const shop = resolveShop();
    if (!shop) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`/api/billing?shop=${encodeURIComponent(shop)}`);
      const payload = response.data || {};
      if (!payload.success) {
        throw new Error(payload.error || "Failed to load billing");
      }

      setHasActiveSubscription(Boolean(payload.hasActiveSubscription));
      setCurrentPlanName(payload.plan || "Starter Plan");
      setPlans(payload.plans || {});
    } catch (error) {
      console.error("Error fetching billing settings:", error);
      toast.error("Failed to load billing settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    const shop = resolveShop();
    if (!shop) {
      toast.error("Shop not found. Please reopen from Shopify Admin.");
      return;
    }

    setUpgradingPlan(plan);
    try {
      const response = await axios.post(`/api/billing?shop=${encodeURIComponent(shop)}`, {
        plan,
      });

      if (!response.data?.success || !response.data?.confirmationUrl) {
        throw new Error(response.data?.error || "Failed to start upgrade");
      }

      if (response.data?.managedPricing) {
        toast.success("This app uses Shopify managed pricing. Continue in Shopify Admin.");
      }

      const confirmationUrl = response.data.confirmationUrl as string;
      if (typeof window !== "undefined") {
        if (window.top && window.top !== window.self) {
          window.top.location.href = confirmationUrl;
        } else {
          window.location.href = confirmationUrl;
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to process upgrade");
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your plan and billing settings</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading billing settings...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Current plan</p>
              <p className="text-lg font-semibold text-gray-900">{currentPlanName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {hasActiveSubscription
                  ? "Your current subscription is active."
                  : "No active paid subscription detected."}
              </p>
            </div>

            {Object.entries(plans).map(([planKey, plan]) => {
              const isCurrent = currentPlanName === plan.name;
              const isProcessing = upgradingPlan === planKey;

              return (
                <div key={planKey} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-600">${plan.price}/month</p>
                    </div>
                    <button
                      onClick={() => handleUpgrade(planKey)}
                      disabled={isCurrent || isProcessing}
                      className="btn-primary disabled:opacity-50"
                    >
                      {isCurrent ? "Current Plan" : isProcessing ? "Processing..." : "Upgrade"}
                    </button>
                  </div>
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="mt-3 text-xs text-gray-600 list-disc list-inside space-y-1">
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
