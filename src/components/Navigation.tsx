import Link from "next/link";
import { useRouter } from "next/router";
import { BarChart3, DollarSign, Clock, FileText, ChevronDown } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

export default function Navigation() {
  const router = useRouter();
  const [upgrading, setUpgrading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [usageLabel, setUsageLabel] = useState<string>("--");
  const [usagePlan, setUsagePlan] = useState<"starter" | "premium" | null>(null);

  const links = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/bulk-pricing", label: "Bulk Pricing", icon: DollarSign },
    { href: "/scheduled", label: "Calendar", icon: Clock },
    { href: "/history", label: "History", icon: FileText },
  ];

  const handlePlanCheckout = async (plan: "starter" | "premium") => {
    if (upgrading) return;

    setUpgrading(true);
    const toastId = toast.loading(
      plan === "premium" ? "Starting Premium checkout..." : "Starting Starter checkout..."
    );

    try {
      const urlShop = typeof router.query.shop === "string" ? router.query.shop : "";
      const storedShop = typeof window !== "undefined" ? localStorage.getItem("shopifyShop") || "" : "";
      const shop = urlShop || storedShop;

      if (!shop) {
        toast.error("Missing shop context. Re-open app from Shopify Admin.", { id: toastId });
        return;
      }

      const response = await axios.post(`/api/billing?shop=${encodeURIComponent(shop)}`, {
        plan,
      });

      if (response.data?.success && response.data?.confirmationUrl) {
        toast.success("Redirecting to Shopify billing confirmation...", { id: toastId });
        setShowPlans(false);
        window.location.href = response.data.confirmationUrl;
        return;
      }

      toast.error(response.data?.error || "Could not start upgrade checkout", { id: toastId });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Upgrade failed", { id: toastId });
    } finally {
      setUpgrading(false);
    }
  };

  useEffect(() => {
    const fetchPlanUsage = async () => {
      if (!router.isReady) return;

      const urlShop = typeof router.query.shop === "string" ? router.query.shop : "";
      const storedShop = typeof window !== "undefined" ? localStorage.getItem("shopifyShop") || "" : "";
      const shop = urlShop || storedShop;

      if (!shop) {
        setUsageLabel("Install on Shopify to start");
        setUsagePlan(null);
        return;
      }

      try {
        const response = await axios.get(`/api/plan-usage?shop=${encodeURIComponent(shop)}`);
        if (response.data?.success) {
          setUsageLabel(response.data.data.label || "--");
          setUsagePlan(response.data.data.plan || null);
        }
      } catch {
        setUsageLabel("Usage unavailable");
      }
    };

    fetchPlanUsage();
  }, [router.isReady, router.query.shop]);

  return (
    <header className="bg-white border-b border-blue-100 sticky top-0 z-50">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <BrandLogo />

          <nav className="hidden md:flex items-center gap-2 text-sm">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = router.pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
                    isActive
                      ? "text-blue-700 font-medium border-blue-600"
                      : "text-gray-600 border-transparent hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className={`hidden lg:flex items-center px-3 py-1.5 rounded-md border text-xs font-medium ${
            usagePlan === "premium"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {usageLabel}
          </div>
          <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-medium">
            pri
          </span>
          <div className="relative">
            <button
              onClick={() => setShowPlans((value) => !value)}
              className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white text-sm px-3 py-1.5 rounded-md border border-amber-300/60 inline-flex items-center gap-1"
            >
              Upgrade
              <ChevronDown className={`w-4 h-4 transition-transform ${showPlans ? "rotate-180" : ""}`} />
            </button>

            {showPlans && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">Choose a plan</p>

                <div className="space-y-2">
                  <div className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Starter</p>
                        <p className="text-xs text-gray-600">$1.99/month · 5 bulk changes/month</p>
                      </div>
                      <button
                        onClick={() => handlePlanCheckout("starter")}
                        disabled={upgrading}
                        className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {upgrading ? "Loading..." : "Select"}
                      </button>
                    </div>
                  </div>

                  <div className="border border-blue-200 bg-blue-50 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Premium</p>
                        <p className="text-xs text-blue-700">$5.99/month · Unlimited bulk changes</p>
                      </div>
                      <button
                        onClick={() => handlePlanCheckout("premium")}
                        disabled={upgrading}
                        className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {upgrading ? "Loading..." : "Upgrade"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 text-right">
                  <Link
                    href="/settings"
                    className="text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => setShowPlans(false)}
                  >
                    Manage billing settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
