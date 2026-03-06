import { useState } from "react";
import { PricePreview } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { exportPreviewToCSV, downloadCSV } from "@lib/csv-utils";

interface PreviewStepProps {
  preview: PricePreview[];
  onBack: () => void;
  onNext: () => void;
}

export default function PreviewStep({ preview, onBack, onNext }: PreviewStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"product" | "savings">("product");

  const filtered = preview.filter(
    (item) =>
      item.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.variantTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "savings") {
      return (b.savings || 0) - (a.savings || 0);
    }
    return a.productTitle.localeCompare(b.productTitle);
  });

  const totalOldPrice = preview.reduce((sum, item) => sum + item.oldPrice, 0);
  const totalNewPrice = preview.reduce((sum, item) => sum + item.newPrice, 0);
  const totalSavings = totalOldPrice - totalNewPrice;
  const averageChange =
    totalOldPrice > 0
      ? ((totalNewPrice - totalOldPrice) / totalOldPrice) * 100
      : 0;

  const handleDownloadCSV = () => {
    const csv = exportPreviewToCSV(preview);
    downloadCSV(csv, `price-changes-${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Step 3: Preview Changes
        </h2>
        <p className="text-gray-600">
          Review the changes before applying. You can undo these changes anytime.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-semibold">Products Affected</p>
          <p className="text-3xl font-bold text-blue-900">{preview.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-semibold">Total Old Price</p>
          <p className="text-3xl font-bold text-purple-900">
            ${totalOldPrice.toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-semibold">Total New Price</p>
          <p className="text-3xl font-bold text-green-900">
            ${totalNewPrice.toFixed(2)}
          </p>
        </div>
        <div
          className={`${
            totalSavings > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
          } border rounded-lg p-4`}
        >
          <p
            className={`text-sm font-semibold ${
              totalSavings > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {totalSavings > 0 ? "Total Decrease" : "Total Increase"}
          </p>
          <p
            className={`text-3xl font-bold ${
              totalSavings > 0 ? "text-red-900" : "text-green-900"
            }`}
          >
            {totalSavings > 0 ? "-" : "+"}${Math.abs(totalSavings).toFixed(2)} (
            {averageChange > 0 ? "+" : ""}{averageChange.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "product" | "savings")}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
        >
          <option value="product">Sort by Product</option>
          <option value="savings">Sort by Savings</option>
        </select>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
        >
          <Download className="w-4 h-4" />
          <span>CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        {sorted.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">No products match these filters</p>
            <p className="text-sm text-gray-600">
              Try adjusting collection, vendor, price range, or inventory filters.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Product
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">
                  Variant
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">
                  Old Price
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">
                  New Price
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">
                  Change
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">
                  Savings
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((item) => (
                <tr
                  key={item.variantId}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {item.productTitle}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{item.variantTitle}</td>
                  <td className="px-6 py-3 text-right text-gray-900">
                    ${item.oldPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">
                    ${item.newPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div
                      className={`flex items-center justify-end space-x-1 ${
                        item.change > 0
                          ? "text-green-600"
                          : item.change < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {item.change !== 0 && (
                        <>
                          {item.change > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {item.change > 0 ? "+" : ""}
                            {item.change.toFixed(2)}%
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-red-600">
                    {item.savings ? (
                      <>-${item.savings.toFixed(2)}</>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 bg-gray-200 text-gray-900 font-semibold py-3 px-8 rounded-lg hover:bg-gray-300 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          className="flex items-center space-x-2 bg-shopify text-white font-semibold py-3 px-8 rounded-lg hover:bg-opacity-90 transition-all"
        >
          <span>Next: Confirm Changes</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
