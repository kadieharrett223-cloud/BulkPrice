import { useState } from "react";
import toast from "react-hot-toast";
import {
  ChevronRight,
  Eye,
  Check,
  AlertCircle,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import { PriceFilter, PriceAction, PricePreview } from "@/types";
import FilterStep from "@components/bulk-pricing/FilterStep";
import ActionStep from "@components/bulk-pricing/ActionStep";
import PreviewStep from "@components/bulk-pricing/PreviewStep";
import ConfirmStep from "@components/bulk-pricing/ConfirmStep";
import axios from "axios";

type Step = "filter" | "action" | "preview" | "confirm";

export default function BulkPricingPage() {
  const [currentStep, setCurrentStep] = useState<Step>("filter");
  const [filters, setFilters] = useState<PriceFilter>({});
  const [action, setAction] = useState<PriceAction>({ type: "percentage_increase", value: 10 });
  const [preview, setPreview] = useState<PricePreview[]>([]);
  const [changeGroupId, setChangeGroupId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lastChangeGroupId, setLastChangeGroupId] = useState<string>("");

  const handleFilterNext = async (newFilters: PriceFilter) => {
    setFilters(newFilters);
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

    try {
      const response = await axios.post("/api/apply-prices", {
        filters,
        action,
        changeGroupId,
      });

      if (response.data.success) {
        setLastChangeGroupId(changeGroupId);
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
        }, 2000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to apply changes");
    } finally {
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
      <div className="mb-8 flex items-center justify-between">
        {(["filter", "action", "preview", "confirm"] as const).map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                step === currentStep
                  ? "bg-shopify text-white ring-4 ring-shopify ring-opacity-20"
                  : ["filter", "action"].includes(step)
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {index + 1}
            </div>
            {index < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  ["filter", "action", "preview"].includes(currentStep) &&
                  ["filter", "action", "preview", "confirm"].indexOf(
                    currentStep
                  ) > index
                    ? "bg-shopify"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

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
