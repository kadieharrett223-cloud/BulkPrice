import Link from "next/link";
import { useRouter } from "next/router";
import { BarChart3, DollarSign, Clock, FileText, ChevronDown } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import axios from "axios";
import toast from "react-hot-toast";
import { useState } from "react";

export default function Navigation() {
  const router = useRouter();
  const [upgrading, setUpgrading] = useState(false);

  const links = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/bulk-pricing", label: "Bulk Pricing", icon: DollarSign },
    { href: "/scheduled", label: "Scheduled", icon: Clock },
    { href: "/history", label: "History", icon: FileText },
  ];

  const handleUpgrade = async () => {
    if (upgrading) return;

    setUpgrading(true);
    const toastId = toast.loading("Starting upgrade checkout...");

    try {
      const urlShop = typeof router.query.shop === "string" ? router.query.shop : "";
      const storedShop = typeof window !== "undefined" ? localStorage.getItem("shopifyShop") || "" : "";
      const shop = urlShop || storedShop;

      if (!shop) {
        toast.error("Missing shop context. Re-open app from Shopify Admin.", { id: toastId });
        return;
      }

      const response = await axios.post(`/api/billing?shop=${encodeURIComponent(shop)}`, {
        plan: "premium",
      });

      if (response.data?.success && response.data?.confirmationUrl) {
        toast.success("Redirecting to Shopify billing confirmation...", { id: toastId });
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
          <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-medium">
            pri
          </span>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white text-sm px-3 py-1.5 rounded-md border border-amber-300/60 disabled:opacity-60"
          >
            {upgrading ? "Upgrading..." : "Upgrade"}
          </button>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </header>
  );
}
