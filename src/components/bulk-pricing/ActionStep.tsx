import { useState } from "react";
import { PriceAction } from "@/types";
import { ChevronLeft, ChevronRight, Loader } from "lucide-react";

interface ActionStepProps {
  onNext: (action: PriceAction) => void;
  onBack: () => void;
  loading: boolean;
  matchingCount: number;
}

export default function ActionStep({ onNext, onBack, loading, matchingCount }: ActionStepProps) {
  const [actionType, setActionType] = useState<PriceAction["type"]>(
    "percentage_increase"
  );
  const [value, setValue] = useState<number>(10);
  const [roundTo, setRoundTo] = useState<".99" | ".95" | ".00">(".99");
  const [includeCompareAt, setIncludeCompareAt] = useState(false);
  const [compareAtType, setCompareAtType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [compareAtValue, setCompareAtValue] = useState<number>(20);

  const handleNext = () => {
    const action: PriceAction = {
      type: actionType,
      value: value,
      includeCompareAt,
    };

    if (actionType === "round") {
      action.roundTo = roundTo;
    }

    if (includeCompareAt) {
      action.compareAtAdjustment = {
        type: compareAtType,
        value: compareAtValue,
      };
    }

    onNext(action);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Step 2: Choose Price Action
        </h2>
        <p className="text-gray-600">
          Select how you want to modify the prices of selected products.
        </p>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-indigo-700 font-semibold">Scope Preview</p>
        <p className="text-indigo-900 text-lg font-bold">{matchingCount} products selected</p>
        <p className="text-sm text-indigo-700">Estimated API operations: {matchingCount}</p>
      </div>

      {/* Action Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            id: "percentage_increase",
            label: "Increase by Percentage",
            icon: "📈",
          },
          {
            id: "percentage_decrease",
            label: "Decrease by Percentage",
            icon: "📉",
          },
          { id: "fixed_increase", label: "Increase by Fixed Amount", icon: "➕" },
          {
            id: "fixed_decrease",
            label: "Decrease by Fixed Amount",
            icon: "➖",
          },
          { id: "exact", label: "Set Exact Price", icon: "🎯" },
          { id: "round", label: "Round Prices", icon: "🔢" },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() =>
              setActionType(option.id as PriceAction["type"])
            }
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              actionType === option.id
                ? "border-shopify bg-shopify bg-opacity-10"
                : "border-gray-200 hover:border-shopify"
            }`}
          >
            <div className="text-2xl mb-2">{option.icon}</div>
            <div className="font-semibold text-gray-900">{option.label}</div>
          </button>
        ))}
      </div>

      {/* Value Input */}
      <div className="space-y-4">
        {actionType !== "round" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {actionType === "exact" ? "Exact Price" : "Value"}
            </label>
            <div className="flex items-center space-x-2">
              {actionType.includes("percentage") && (
                <span className="text-lg font-semibold text-gray-700">%</span>
              )}
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                step={actionType.includes("percentage") ? 0.1 : 0.01}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
              />
              {!actionType.includes("percentage") && actionType !== "exact" && (
                <span className="text-lg font-semibold text-gray-700">$</span>
              )}
            </div>
          </div>
        )}

        {actionType === "round" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Round to:
            </label>
            <div className="space-y-2">
              {[".99", ".95", ".00"].map((option) => (
                <label key={option} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="round"
                    value={option}
                    checked={roundTo === option}
                    onChange={(e) =>
                      setRoundTo(e.target.value as ".99" | ".95" | ".00")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">
                    {option === ".99" && "Price ends in .99 (e.g., $21.99)"}
                    {option === ".95" && "Price ends in .95 (e.g., $21.95)"}
                    {option === ".00" && "Price is whole number (e.g., $22.00)"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Compare-at Price */}
      <div className="border-t pt-6">
        <label className="flex items-center space-x-3 mb-4">
          <input
            type="checkbox"
            checked={includeCompareAt}
            onChange={(e) => setIncludeCompareAt(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="font-semibold text-gray-700">
            Also update Compare-at Price
          </span>
        </label>

        {includeCompareAt && (
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Compare-at Adjustment:
              </label>
              <div className="space-y-2">
                {["percentage", "fixed"].map((type) => (
                  <label
                    key={type}
                    className="flex items-center space-x-3 mb-3"
                  >
                    <input
                      type="radio"
                      name="compareAtType"
                      value={type}
                      checked={compareAtType === type}
                      onChange={(e) =>
                        setCompareAtType(
                          e.target.value as "percentage" | "fixed"
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {compareAtType === "percentage"
                  ? "Percentage higher than sale price"
                  : "Fixed amount higher than sale price"}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={compareAtValue}
                  onChange={(e) => setCompareAtValue(Number(e.target.value))}
                  step={compareAtType === "percentage" ? 0.1 : 0.01}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
                />
                <span className="font-semibold text-gray-700">
                  {compareAtType === "percentage" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 bg-gray-200 text-gray-900 font-semibold py-3 px-8 rounded-lg hover:bg-gray-300 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="flex items-center space-x-2 bg-shopify text-white font-semibold py-3 px-8 rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
        >
          {loading && <Loader className="w-5 h-5 animate-spin" />}
          <span>{loading ? "Generating Preview..." : "Next: Preview Changes"}</span>
          {!loading && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
