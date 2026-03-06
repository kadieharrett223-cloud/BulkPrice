import { useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle,
  AlertCircle,
  Loader,
  RotateCcw,
} from "lucide-react";
import { PriceFilter, PriceAction, PricePreview } from "@/types";
import FilterStep from "@components/bulk-pricing/FilterStep";
import ActionStep from "@components/bulk-pricing/ActionStep";
import PreviewStep from "@components/bulk-pricing/PreviewStep";
import ConfirmStep from "@components/bulk-pricing/ConfirmStep";
import axios from "axios";
import Link from "next/link";

type Step = "filter" | "action" | "preview" | "confirm";

const STEPS: Array<{ key: Step; title: string }> = [
  { key: "filter", title: "Select Products" },
  { key: "action", title: "Choose Pricing Rule" },
  { key: "preview", title: "Preview Changes" },
  { key: "confirm", title: "Apply Update" },
];

export default function BulkPricingPage() {
  const [currentStep, setCurrentStep] = useState<Step>("filter");
  const [filters, setFilters] = useState<PriceFilter>({});
  const [action, setAction] = useState<PriceAction>({ type: "percentage_increase", value: 10 });
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

  const handleFilterNext = async (newFilters: PriceFilter) => {
    setFilters(newFilters);

    try {
      const response = await axios.post("/api/preview-count", {
        filters: newFilters,
      });
      if (response.data.success) {
        setMatchingCount(response.data.data.count || 0);
      }
    } catch {
      setMatchingCount(0);
    }

    setCurrentStep("action");
  };

  const handleActionNext = async (newAction: PriceAction) => {
    setAction(newAction);
    setLoading(true);

    try {
      const response = await axios.post("/api/preview-prices", {
        filters,
        action: newAction,
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

  const handlePreviewBack = () => {
    setCurrentStep("action");
  };

  const handlePreviewNext = () => {
    setCurrentStep("confirm");
  };

  const handleConfirm = async () => {
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
      const response = await axios.post("/api/apply-prices", {
        filters,
        action,
        changeGroupId,
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
          setCurrentStep("filter");
          setFilters({});
          setAction({ type: "percentage_increase", value: 10 });
          setPreview([]);
          setChangeGroupId("");
          setMatchingCount(0);
          setRunProgress(0);
        }, 2000);
      }
    } catch (error: any) {
      clearInterval(progressTimer);
      setRunProgress(0);
      toast.error(error.response?.data?.error || "Failed to apply changes");
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
      const response = await axios.post("/api/rollback", {
        changeGroupId: lastChangeGroupId,
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Bulk Price Editor</h1>
        <p className="text-gray-600">
          Run flash sales and bulk price updates with smart filters, preview, and rollback
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const activeIndex = STEPS.findIndex((item) => item.key === currentStep);
            const isCurrent = currentStep === step.key;
            const isCompleted = index < activeIndex;

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center min-w-[110px]">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                      isCurrent
                        ? "bg-shopify text-white ring-4 ring-shopify ring-opacity-20"
                        : isCompleted
                        ? "bg-shopify/20 text-shopify"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  <span className={`mt-2 text-xs font-semibold ${isCurrent ? "text-shopify" : "text-gray-600"}`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${isCompleted ? "bg-shopify" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-shopify transition-all duration-500"
            style={{
              width: `${((STEPS.findIndex((item) => item.key === currentStep) + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentStep !== "filter" && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Products matching filters</p>
            <p className="text-2xl font-bold text-blue-900">{matchingCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Estimated API operations</p>
            <p className="text-2xl font-bold text-blue-900">{matchingCount}</p>
          </div>
          <p className="text-sm text-blue-800">
            {matchingCount === 0
              ? "No products match these filters. Adjust filters before continuing."
              : `${matchingCount} variants selected and ready for bulk update.`}
          </p>
        </div>
      )}

      {loading && currentStep === "confirm" && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2 text-amber-800 font-semibold">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Updating products...</span>
          </div>
          <div className="bg-amber-100 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${runProgress}%` }} />
          </div>
          <p className="text-sm text-amber-700 mt-2">
            {Math.floor((preview.length * runProgress) / 100)} / {preview.length} processed
          </p>
        </div>
      )}

      {lastRunSummary && !loading && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-700 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Bulk update completed</p>
              <p className="text-sm text-green-800">
                Products updated: {lastRunSummary.affectedCount} • Failed: {lastRunSummary.failedCount} • Duration: {(lastRunSummary.durationMs / 1000).toFixed(1)}s
              </p>
            </div>
          </div>
          <Link href="/history" className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800">
            View History
          </Link>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        {currentStep === "filter" && (
          <FilterStep onNext={handleFilterNext} />
        )}
        {currentStep === "action" && (
          <ActionStep
            onNext={handleActionNext}
            onBack={() => setCurrentStep("filter")}
            loading={loading}
            matchingCount={matchingCount}
          />
        )}
        {currentStep === "preview" && (
          <PreviewStep
            preview={preview}
            onBack={handlePreviewBack}
            onNext={handlePreviewNext}
          />
        )}
        {currentStep === "confirm" && (
          <ConfirmStep
            affectedCount={preview.length}
            onConfirm={handleConfirm}
            onBack={() => setCurrentStep("preview")}
            loading={loading}
            progress={runProgress}
          />
        )}
      </div>

      {/* Rollback Button */}
      {lastChangeGroupId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-900">Last change can be undone</p>
              <p className="text-sm text-yellow-700">You can rollback the previous price change</p>
            </div>
          </div>
          <button
            onClick={handleRollback}
            disabled={loading}
            className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Undo Changes</span>
          </button>
        </div>
      )}
    </div>
  );
}
