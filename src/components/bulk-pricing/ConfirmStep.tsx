import { useState } from "react";
import { ChevronLeft, AlertCircle, CheckCircle, Loader } from "lucide-react";

interface ConfirmStepProps {
  affectedCount: number;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
  progress: number;
}

export default function ConfirmStep({
  affectedCount,
  onConfirm,
  onBack,
  loading,
  progress,
}: ConfirmStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Step 4: Confirm Changes
        </h2>
        <p className="text-gray-600">
          Review your final confirmation before applying these changes to your store.
        </p>
      </div>

      {/* Warning Box */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
        <div className="flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Important</h3>
            <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
              <li>
                You are about to update prices for{" "}
                <strong>{affectedCount} products</strong>
              </li>
              <li>This action will be applied immediately to your Shopify store</li>
              <li>You can undo this change from the last 30 days</li>
              <li>All changes are logged and visible in your history</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <CheckCircle className="w-6 h-6 text-blue-600" />
          <h3 className="font-semibold text-blue-900 text-lg">Ready to Apply</h3>
        </div>
        <p className="text-blue-800">
          You are ready to apply price changes to <strong>{affectedCount}</strong>{" "}
          product{affectedCount === 1 ? "" : "s"}. Click the button below to proceed.
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="w-4 h-4 mt-1"
          />
          <span className="text-sm text-gray-700">
            I understand these changes will update live store prices and may require rollback to undo.
          </span>
        </label>
      </div>

      {loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-2">Applying updates...</p>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-shopify transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Safety Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="text-2xl mb-2">✓</div>
          <h4 className="font-semibold text-green-900 mb-1">Changes are reversible</h4>
          <p className="text-sm text-green-700">Undo this change anytime</p>
        </div>
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="text-2xl mb-2">📝</div>
          <h4 className="font-semibold text-green-900 mb-1">Fully logged</h4>
          <p className="text-sm text-green-700">All changes are tracked</p>
        </div>
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="text-2xl mb-2">⚡</div>
          <h4 className="font-semibold text-green-900 mb-1">Applied instantly</h4>
          <p className="text-sm text-green-700">Updates to your store immediately</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex items-center space-x-2 bg-gray-200 text-gray-900 font-semibold py-3 px-8 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <button
          onClick={onConfirm}
          disabled={loading || !acknowledged || affectedCount === 0}
          className="flex items-center space-x-2 bg-green-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all"
        >
          {loading && <Loader className="w-5 h-5 animate-spin" />}
          <span>
            {loading
              ? "Applying Changes..."
              : `Apply to ${affectedCount} Product${affectedCount === 1 ? "" : "s"}`}
          </span>
        </button>
      </div>
    </div>
  );
}
