import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Loader,
  RotateCcw,
} from "lucide-react";
import { PriceFilter, PriceAction, PricePreview } from "@/types";
import axios from "axios";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

type Step = "filter" | "action" | "preview" | "confirm";

const STEPS: Array<{ key: Step; title: string }> = [
  { key: "filter", title: "Select Products" },
  { key: "action", title: "Choose Pricing Rule" },
  { key: "preview", title: "Preview Changes" },
  { key: "confirm", title: "Apply Update" },
];

export default function BulkPricingPage() {
  const [currentStep, setCurrentStep] = useState<Step>("action");
  const [filters, setFilters] = useState<PriceFilter>({});
  const [action, setAction] = useState<PriceAction>({ type: "percentage_increase", value: 10, targetField: "base" });
  const [preview, setPreview] = useState<PricePreview[]>([]);
  const [changeGroupId, setChangeGroupId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lastChangeGroupId, setLastChangeGroupId] = useState<string>("");
  const [matchingCount, setMatchingCount] = useState(0);
  const [runProgress, setRunProgress] = useState(0);
  const [lastRunSummary, setLastRunSummary] = useState<{
    affectedCount: number;
    failedCount: number;
    durationMs: number;
  } | null>(null);

  const [collectionInput, setCollectionInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [productTypeInput, setProductTypeInput] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived" | "">("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(300);
  const [inventoryMin, setInventoryMin] = useState(0);
  const [inventoryMax, setInventoryMax] = useState(500);
  const [acknowledged, setAcknowledged] = useState(false);

  const activeStepIndex = STEPS.findIndex((item) => item.key === currentStep);

  const summaryRuleText = useMemo(() => {
    const value = action.value ?? 0;
    switch (action.type) {
      case "percentage_increase":
        return `Increase prices by +${value}%`;
      case "percentage_decrease":
        return `Decrease prices by -${value}%`;
      case "fixed_increase":
        return `Increase prices by +$${value}`;
      case "fixed_decrease":
        return `Decrease prices by -$${value}`;
      case "exact":
        return `Set exact price to $${value}`;
      case "round":
        return `Round prices to ${action.roundTo || ".99"}`;
      default:
        return "No active pricing rule";
    }
  }, [action]);

  const applyFilters = async () => {
    const nextFilters: PriceFilter = {};

    if (collectionInput.trim()) {
      nextFilters.collections = [collectionInput.trim()];
    }
    if (vendorInput.trim()) {
      nextFilters.vendors = [vendorInput.trim()];
    }
    if (productTypeInput.trim()) {
      nextFilters.productTypes = [productTypeInput.trim()];
    }
    if (status) {
      nextFilters.statuses = [status];
    }
    if (priceMin > 0 || priceMax < 300) {
      nextFilters.priceRange = { min: priceMin, max: priceMax };
    }
    if (inventoryMin > 0 || inventoryMax < 500) {
      nextFilters.inventoryRange = { min: inventoryMin, max: inventoryMax };
    }

    setFilters(nextFilters);

    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get("shop") || localStorage.getItem("shopifyShop") || "";

    try {
      const response = await axios.post("/api/preview-count", { filters: nextFilters, shop });
      if (response.data.success) {
        setMatchingCount(response.data.data.count || 0);
        toast.success("Filters applied");
      }
      setCurrentStep("action");
    } catch {
      setMatchingCount(0);
      toast.error("Failed to apply filters");
    }
  };

  const resetFilters = async () => {
    setCollectionInput("");
    setVendorInput("");
    setProductTypeInput("");
    setStatus("");
    setPriceMin(0);
    setPriceMax(300);
    setInventoryMin(0);
    setInventoryMax(500);
    setFilters({});

    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get("shop") || localStorage.getItem("shopifyShop") || "";

    try {
      const response = await axios.post("/api/preview-count", { filters: {}, shop });
      if (response.data.success) {
        setMatchingCount(response.data.data.count || 0);
      }
    } catch {
      setMatchingCount(0);
    }
  };

  const generatePreview = async () => {
    setLoading(true);

    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get("shop") || localStorage.getItem("shopifyShop") || "";

    try {
      const response = await axios.post("/api/preview-prices", {
        filters,
        action,
        shop,
      });

      if (response.data.success) {
        setPreview(response.data.data.preview);
        setChangeGroupId(response.data.data.changeGroupId);
        setCurrentStep("preview");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to preview changes");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!acknowledged) {
      toast.error("Please acknowledge before applying changes");
      return;
    }

    setLoading(true);
    setRunProgress(8);

    const progressTimer = setInterval(() => {
      setRunProgress((previous) => {
        if (previous >= 92) {
          return previous;
        }

        const increment = previous < 40 ? 8 : previous < 70 ? 4 : 2;
        return Math.min(previous + increment, 92);
      });
    }, 300);

    try {
      // Get shop from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get("shop") || localStorage.getItem("shopifyShop") || "";

      const response = await axios.post("/api/apply-prices", {
        filters,
        action,
        changeGroupId,
        shop,
      });

      if (response.data.success) {
        clearInterval(progressTimer);
        setRunProgress(100);
        setLastChangeGroupId(changeGroupId);
        setLastRunSummary({
          affectedCount: response.data.data.affectedCount,
          failedCount: response.data.data.failedCount || 0,
          durationMs: response.data.data.durationMs || 0,
        });
        toast.success(
          `Successfully updated prices for ${response.data.data.affectedCount} products`
        );
        // Reset
        setTimeout(() => {
          setCurrentStep("action");
          setAction({ type: "percentage_increase", value: 10, targetField: "base" });
          setPreview([]);
          setChangeGroupId("");
          setRunProgress(0);
          setAcknowledged(false);
        }, 2000);
      }
    } catch (error: any) {
      clearInterval(progressTimer);
      setRunProgress(0);
      const statusCode = error?.response?.status;
      const message = error?.response?.data?.error || "Failed to apply changes";

      if (statusCode === 402) {
        toast.error(`${message} Use the Upgrade button in the top bar to switch to Premium.`);
      } else {
        toast.error(message);
      }
    } finally {
      clearInterval(progressTimer);
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!lastChangeGroupId) {
      toast.error("No recent changes to rollback");
      return;
    }

    if (!confirm("Are you sure you want to rollback the last price change?")) {
      return;
    }

    setLoading(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get("shop") || localStorage.getItem("shopifyShop") || "";

      const response = await axios.post("/api/rollback", {
        changeGroupId: lastChangeGroupId,
        shop,
      });

      if (response.data.success) {
        toast.success(`Rolled back ${response.data.data.affectedCount} prices`);
        setLastChangeGroupId("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to rollback changes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] gap-6 p-6">
        <aside className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 h-fit">
          <div className="mb-5 pb-4 border-b border-blue-100">
            <BrandLogo href="/bulk-pricing" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Products</h2>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Collections</label>
              <input
                value={collectionInput}
                onChange={(event) => setCollectionInput(event.target.value)}
                placeholder="Select collections"
                className="w-full border border-gray-200 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Vendors</label>
              <input
                value={vendorInput}
                onChange={(event) => setVendorInput(event.target.value)}
                placeholder="Select vendors"
                className="w-full border border-gray-200 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Product Types</label>
              <input
                value={productTypeInput}
                onChange={(event) => setProductTypeInput(event.target.value)}
                placeholder="Select product types"
                className="w-full border border-gray-200 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Price range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceMin}
                  onChange={(event) => setPriceMin(Number(event.target.value))}
                  className="w-full border border-gray-200 rounded-md px-2 py-2"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(event) => setPriceMax(Number(event.target.value))}
                  className="w-full border border-gray-200 rounded-md px-2 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Inventory range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={inventoryMin}
                  onChange={(event) => setInventoryMin(Number(event.target.value))}
                  className="w-full border border-gray-200 rounded-md px-2 py-2"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={inventoryMax}
                  onChange={(event) => setInventoryMax(Number(event.target.value))}
                  className="w-full border border-gray-200 rounded-md px-2 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "active" | "draft" | "archived" | "")}
                className="w-full border border-gray-200 rounded-md px-3 py-2"
              >
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <button
              onClick={applyFilters}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md border border-amber-300/60"
            >
              Apply Filters
            </button>

            <p className="text-sm text-gray-600 text-center">{matchingCount} matching products</p>

            <button
              onClick={resetFilters}
              className="w-full border border-gray-200 bg-gray-50 text-gray-700 py-2 rounded-md"
            >
              Reset filters
            </button>
          </div>
        </aside>

        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-6 mb-6 overflow-x-auto pb-1">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex items-center gap-2 whitespace-nowrap">
                <div
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                    index === activeStepIndex
                      ? "bg-blue-600 text-white ring-2 ring-amber-300/70"
                      : index < activeStepIndex
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-sm text-gray-700">{step.title}</span>
                {index < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>

          <div className="mb-4 border-l-4 border-amber-400 pl-3">
            <h1 className="text-2xl font-semibold text-gray-900">Bulk Pricing</h1>
            <p className="text-sm text-gray-500">Set a pricing rule after applying filters</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price Field to Update</label>
              <select
                value={action.targetField || "base"}
                onChange={(event) =>
                  setAction({ ...action, targetField: event.target.value as "base" | "compare_at" | "both" })
                }
                className="w-full border border-gray-200 rounded-md p-2 text-sm"
              >
                <option value="base">Base price only</option>
                <option value="compare_at">Compare-at price only</option>
                <option value="both">Both base and compare-at prices</option>
              </select>
            </div>

            <select
              value={action.type}
              onChange={(event) => setAction({ ...action, type: event.target.value as PriceAction["type"] })}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
            >
              <option value="percentage_increase">Increase prices by</option>
              <option value="percentage_decrease">Decrease prices by</option>
              <option value="fixed_increase">Increase by fixed amount</option>
              <option value="fixed_decrease">Decrease by fixed amount</option>
              <option value="exact">Set exact price</option>
              <option value="round">Round prices</option>
            </select>

            {action.type !== "round" ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={action.value ?? 0}
                  onChange={(event) => setAction({ ...action, value: Number(event.target.value) })}
                  className="border border-gray-200 rounded-md p-2 w-32 text-sm"
                />
                <span className="text-gray-600 text-sm">
                  {action.type.includes("percentage") ? "%" : "$"}
                </span>
              </div>
            ) : (
              <select
                value={action.roundTo || ".99"}
                onChange={(event) =>
                  setAction({ ...action, roundTo: event.target.value as ".99" | ".95" | ".00" })
                }
                className="border border-gray-200 rounded-md p-2 w-44 text-sm"
              >
                <option value=".99">Round to .99</option>
                <option value=".95">Round to .95</option>
                <option value=".00">Round to .00</option>
              </select>
            )}
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full mt-0">
              <thead className="text-xs text-gray-500 border-b bg-gray-50">
                <tr>
                  <th className="py-3 px-3 text-left"></th>
                  <th className="py-3 px-3 text-left">Product</th>
                  <th className="py-3 px-3 text-right">Current Price</th>
                  <th className="py-3 px-3 text-right">New Price</th>
                  <th className="py-3 px-3 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {(preview.length ? preview.slice(0, 8) : []).map((item) => (
                  <tr key={item.variantId} className="border-b text-sm">
                    <td className="py-3 px-3">
                      <input type="checkbox" defaultChecked />
                    </td>
                    <td className="py-3 px-3 text-gray-900">
                      {item.productTitle}
                      <span className="text-xs text-gray-500 ml-2">{item.variantTitle}</span>
                    </td>
                    <td className="py-3 px-3 text-right">${item.oldPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">${item.newPrice.toFixed(2)}</td>
                    <td className={`py-3 px-3 text-right font-semibold ${item.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {item.change >= 0 ? "+" : ""}
                      {item.change.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                {preview.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                      No preview data yet. Apply filters and click Preview Changes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2 text-sm text-gray-700">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Updating products...</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${runProgress}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {Math.floor((preview.length * runProgress) / 100)} / {preview.length} completed
              </p>
            </div>
          )}

          {currentStep === "preview" && (
            <div className="mt-4 border border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-900 font-medium mb-2">
                ⚠ You are about to update {preview.length} products. This action will modify live prices.
              </p>
              <label className="flex items-start gap-2 text-sm text-yellow-800">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-0.5"
                />
                I understand these changes will update store prices.
              </label>
            </div>
          )}

          {lastRunSummary && !loading && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Bulk update completed</p>
                  <p className="text-sm text-green-800">
                    Products updated: {lastRunSummary.affectedCount} • Failed: {lastRunSummary.failedCount} • Duration: {(lastRunSummary.durationMs / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
              <Link href="/history" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800">
                View History
              </Link>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setCurrentStep("preview");
                generatePreview();
              }}
              disabled={loading || matchingCount === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50 border border-amber-300/60"
            >
              Preview Changes
            </button>
            <button
              onClick={() => {
                setCurrentStep("confirm");
                handleConfirm();
              }}
              disabled={loading || preview.length === 0 || !acknowledged}
              className="border border-gray-200 bg-white text-gray-800 px-6 py-2 rounded-md disabled:opacity-50"
            >
              Review & Apply
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>{matchingCount} products selected</p>
              <p>Estimated {matchingCount} operations</p>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded">
              <p className="text-xs uppercase tracking-wide text-amber-600 font-semibold mb-1">Active rule</p>
              <p className="text-sm text-gray-700">
                {summaryRuleText.includes("+") ? "Increase prices by" : "Active rule"}
                <span className="text-blue-700 font-semibold ml-1">{summaryRuleText.replace("Increase prices by ", "")}</span>
              </p>
            </div>
          </div>

          {lastChangeGroupId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">Rollback available</p>
                  <p className="text-sm text-yellow-700">Undo the latest bulk price update.</p>
                </div>
              </div>
              <button
                onClick={handleRollback}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Undo Changes</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
