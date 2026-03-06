import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { PriceAction, PriceFilter, ScheduledChange } from "@/types";
import { Clock, Plus, Trash2, AlertCircle } from "lucide-react";
import { calculateNewPrice, formatDate } from "@lib/price-utils";

export default function ScheduledPage() {
  const [changes, setChanges] = useState<ScheduledChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    autoRevert: true,
  });

  const [ruleType, setRuleType] = useState<PriceAction["type"]>("percentage_decrease");
  const [ruleValue, setRuleValue] = useState<number>(20);
  const [roundTo, setRoundTo] = useState<".99" | ".95" | ".00">(".99");
  const [marginProtectionEnabled, setMarginProtectionEnabled] = useState(false);
  const [marginProtectionMode, setMarginProtectionMode] = useState<
    "fixed_minimum" | "cost_plus_percentage" | "cost_plus_fixed"
  >("fixed_minimum");
  const [marginProtectionValue, setMarginProtectionValue] = useState<number>(10);

  const [collectionInput, setCollectionInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [productTypeInput, setProductTypeInput] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived" | "">("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(300);
  const [inventoryMin, setInventoryMin] = useState(0);
  const [inventoryMax, setInventoryMax] = useState(500);

  const [impact, setImpact] = useState({
    affectedCount: 0,
    estimatedOperations: 0,
    averageChangePercent: 0,
    lowestPrice: 0,
    highestPrice: 0,
    estimatedRevenueImpact: 0,
    belowCostCount: 0,
    loaded: false,
  });

  useEffect(() => {
    fetchScheduledChanges();
  }, []);

  const fetchScheduledChanges = async () => {
    try {
      const response = await axios.get("/api/scheduled-changes");
      if (response.data.success) {
        setChanges(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching scheduled changes:", error);
      toast.error("Failed to load scheduled changes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled change?")) {
      return;
    }

    try {
      const response = await axios.delete(`/api/scheduled-changes?id=${id}`);
      if (response.data.success) {
        setChanges(changes.filter((c) => c.id !== id));
        toast.success("Scheduled change deleted");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete");
    }
  };

  const handleSaveForm = async () => {
    if (!formData.name || !formData.startTime) {
      toast.error("Name and start time are required");
      return;
    }

    if (formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast.error("End time must be after start time");
      return;
    }

    const filters = buildFilters();
    const action = buildAction();

    try {
      const response = await axios.post("/api/scheduled-changes", {
        ...formData,
        filters,
        action,
      });

      if (response.data.success) {
        toast.success("Scheduled change created");
        setShowForm(false);
        setFormData({
          name: "",
          description: "",
          startTime: "",
          endTime: "",
          autoRevert: true,
        });
        setRuleType("percentage_decrease");
        setRuleValue(20);
        setRoundTo(".99");
        setMarginProtectionEnabled(false);
        setMarginProtectionMode("fixed_minimum");
        setMarginProtectionValue(10);
        setCollectionInput("");
        setVendorInput("");
        setProductTypeInput("");
        setStatus("");
        setPriceMin(0);
        setPriceMax(300);
        setInventoryMin(0);
        setInventoryMax(500);
        setImpact({
          affectedCount: 0,
          estimatedOperations: 0,
          averageChangePercent: 0,
          lowestPrice: 0,
          highestPrice: 0,
          estimatedRevenueImpact: 0,
          belowCostCount: 0,
          loaded: false,
        });
        fetchScheduledChanges();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create scheduled change");
    }
  };

  const buildFilters = (): PriceFilter => {
    const filters: PriceFilter = {};

    if (collectionInput.trim()) {
      filters.collections = [collectionInput.trim()];
    }
    if (vendorInput.trim()) {
      filters.vendors = [vendorInput.trim()];
    }
    if (productTypeInput.trim()) {
      filters.productTypes = [productTypeInput.trim()];
    }
    if (status) {
      filters.statuses = [status];
    }
    if (priceMin > 0 || priceMax < 300) {
      filters.priceRange = { min: priceMin, max: priceMax };
    }
    if (inventoryMin > 0 || inventoryMax < 500) {
      filters.inventoryRange = { min: inventoryMin, max: inventoryMax };
    }

    return filters;
  };

  const buildAction = (): PriceAction => {
    if (ruleType === "round") {
      return {
        type: ruleType,
        roundTo,
        marginProtection: {
          enabled: marginProtectionEnabled,
          mode: marginProtectionMode,
          value: marginProtectionValue,
        },
      };
    }

    return {
      type: ruleType,
      value: ruleValue,
      marginProtection: {
        enabled: marginProtectionEnabled,
        mode: marginProtectionMode,
        value: marginProtectionValue,
      },
    };
  };

  const calculateImpact = async () => {
    const filters = buildFilters();
    const action = buildAction();

    try {
      const [countResponse, previewResponse] = await Promise.all([
        axios.post("/api/preview-count", { filters }),
        axios.post("/api/preview-prices", { filters, action }),
      ]);

      const count = countResponse.data?.data?.count || 0;
      const previewRows = previewResponse.data?.data?.preview || [];
      const averageChangePercent =
        previewRows.length > 0
          ? previewRows.reduce((sum: number, row: any) => sum + (row.change || 0), 0) / previewRows.length
          : 0;
      const lowestPrice =
        previewRows.length > 0
          ? Math.min(...previewRows.map((row: any) => Number(row.newPrice || 0)))
          : 0;
      const highestPrice =
        previewRows.length > 0
          ? Math.max(...previewRows.map((row: any) => Number(row.newPrice || 0)))
          : 0;
      const estimatedRevenueImpact =
        previewRows.length > 0
          ? previewRows.reduce((sum: number, row: any) => sum + (Number(row.newPrice || 0) - Number(row.oldPrice || 0)), 0)
          : 0;
      const belowCostCount =
        previewRows.length > 0
          ? previewRows.filter((row: any) => row.wasProtected).length
          : 0;

      setImpact({
        affectedCount: count,
        estimatedOperations: count,
        averageChangePercent,
        lowestPrice,
        highestPrice,
        estimatedRevenueImpact,
        belowCostCount,
        loaded: true,
      });
    } catch (error) {
      toast.error("Failed to calculate impact preview");
      setImpact({
        affectedCount: 0,
        estimatedOperations: 0,
        averageChangePercent: 0,
        lowestPrice: 0,
        highestPrice: 0,
        estimatedRevenueImpact: 0,
        belowCostCount: 0,
        loaded: true,
      });
    }
  };

  const samplePreview = calculateNewPrice(50, buildAction());

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      scheduled: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
          statusStyles[status as keyof typeof statusStyles]
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Scheduled Price Changes
          </h1>
          <p className="text-gray-600">
            Plan your price changes for specific dates and times
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Schedule Change</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 mb-8">
          <div className="flex flex-wrap gap-3 mb-6">
            {["Campaign details", "Select products", "Set pricing rule", "Schedule", "Preview"].map((step, index) => (
              <div key={step} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold ${index === 0 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6">
              <section className="border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Black Friday Sale"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      placeholder="Optional description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section className="border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Rule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rule Type</label>
                    <select
                      value={ruleType}
                      onChange={(e) => setRuleType(e.target.value as PriceAction["type"])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="percentage_decrease">Decrease price by %</option>
                      <option value="percentage_increase">Increase price by %</option>
                      <option value="fixed_decrease">Decrease by fixed amount</option>
                      <option value="fixed_increase">Increase by fixed amount</option>
                      <option value="exact">Set exact price</option>
                      <option value="round">Round price endings</option>
                    </select>
                  </div>

                  {ruleType === "round" ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Rounding Preset</label>
                      <select
                        value={roundTo}
                        onChange={(e) => setRoundTo(e.target.value as ".99" | ".95" | ".00")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value=".99">Round to .99</option>
                        <option value=".95">Round to .95</option>
                        <option value=".00">Round to .00</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Value</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={ruleValue}
                          onChange={(e) => setRuleValue(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-sm text-gray-600">{ruleType.includes("percentage") ? "%" : "$"}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Preview: $50.00 → ${samplePreview.toFixed(2)}
                </div>

                <div className="mt-4 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      checked={marginProtectionEnabled}
                      onChange={(e) => setMarginProtectionEnabled(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">Prevent prices below protected floor</span>
                  </label>

                  {marginProtectionEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Protection Mode</label>
                        <select
                          value={marginProtectionMode}
                          onChange={(e) =>
                            setMarginProtectionMode(
                              e.target.value as "fixed_minimum" | "cost_plus_percentage" | "cost_plus_fixed"
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="fixed_minimum">Minimum fixed price</option>
                          <option value="cost_plus_percentage">Cost + percentage margin</option>
                          <option value="cost_plus_fixed">Cost + fixed amount</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Value</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={marginProtectionValue}
                            onChange={(e) => setMarginProtectionValue(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <span className="text-sm text-gray-600">
                            {marginProtectionMode === "cost_plus_percentage" ? "%" : "$"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Products</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Collection</label>
                    <input
                      value={collectionInput}
                      onChange={(e) => setCollectionInput(e.target.value)}
                      placeholder="Summer Collection"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor</label>
                    <input
                      value={vendorInput}
                      onChange={(e) => setVendorInput(e.target.value)}
                      placeholder="Nike"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Type</label>
                    <input
                      value={productTypeInput}
                      onChange={(e) => setProductTypeInput(e.target.value)}
                      placeholder="Shoes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "active" | "draft" | "archived" | "")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Any status</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      <span className="text-gray-500">-</span>
                      <input type="number" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Inventory Range</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={inventoryMin} onChange={(e) => setInventoryMin(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      <span className="text-gray-500">-</span>
                      <input type="number" value={inventoryMax} onChange={(e) => setInventoryMax(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="border border-gray-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End</label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">Timezone: {timezone} (store timezone recommended)</p>

                <label className="flex items-center space-x-3 mt-4">
                  <input
                    type="checkbox"
                    checked={formData.autoRevert}
                    onChange={(e) => setFormData({ ...formData, autoRevert: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-700 font-medium">Restore original prices after end</span>
                </label>
              </section>

              <section className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Sale Impact Preview</h3>
                  <button
                    onClick={calculateImpact}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Calculate Impact
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Products affected</p>
                    <p className="text-xl font-semibold text-gray-900">{impact.affectedCount}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Estimated API operations</p>
                    <p className="text-xl font-semibold text-gray-900">{impact.estimatedOperations}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Average discount</p>
                    <p className={`text-xl font-semibold ${impact.averageChangePercent <= 0 ? "text-green-600" : "text-red-600"}`}>
                      {impact.averageChangePercent > 0 ? "+" : ""}
                      {impact.averageChangePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Lowest price after change</p>
                    <p className="text-xl font-semibold text-gray-900">${impact.lowestPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Highest price after change</p>
                    <p className="text-xl font-semibold text-gray-900">${impact.highestPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-500">Estimated revenue impact</p>
                    <p className={`text-xl font-semibold ${impact.estimatedRevenueImpact <= 0 ? "text-red-600" : "text-green-600"}`}>
                      {impact.estimatedRevenueImpact > 0 ? "+" : ""}${impact.estimatedRevenueImpact.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Products adjusted by margin protection: <span className="font-semibold">{impact.belowCostCount}</span>
                </div>

                {!impact.loaded && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">Calculate impact to preview products affected and estimated operations before scheduling.</p>
                  </div>
                )}
              </section>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveForm}
                  className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Create Schedule
                </button>
              </div>
            </div>

            <aside className="border border-gray-200 rounded-lg p-5 h-fit">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="text-gray-900 font-medium">{formData.name || "Untitled campaign"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Products</p>
                  <p className="text-gray-900 font-medium">{impact.affectedCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Rule</p>
                  <p className="text-gray-900 font-medium">
                    {ruleType === "round"
                      ? `Round to ${roundTo}`
                      : `${ruleType.includes("decrease") ? "-" : "+"}${ruleValue}${ruleType.includes("percentage") ? "%" : "$"}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Protection</p>
                  <p className="text-gray-900 font-medium">
                    {marginProtectionEnabled
                      ? marginProtectionMode === "fixed_minimum"
                        ? `Min $${marginProtectionValue}`
                        : marginProtectionMode === "cost_plus_percentage"
                        ? `Cost + ${marginProtectionValue}%`
                        : `Cost + $${marginProtectionValue}`
                      : "Disabled"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Start</p>
                  <p className="text-gray-900 font-medium">{formData.startTime ? formatDate(formData.startTime, "long") : "Not set"}</p>
                </div>
                <div>
                  <p className="text-gray-500">End</p>
                  <p className="text-gray-900 font-medium">{formData.endTime ? formatDate(formData.endTime, "long") : "Not set"}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="px-8 py-12 text-center text-gray-500">Loading...</div>
        ) : changes.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No scheduled changes yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-shopify hover:text-shopify/80 font-semibold"
            >
              Schedule your first price change →
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {changes.map((change) => (
              <div
                key={change.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {change.name}
                    </h3>
                    {change.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {change.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(change.status)}
                    <button
                      onClick={() => handleDelete(change.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-semibold">Start Time</p>
                    <p className="text-gray-900">
                      {formatDate(change.startTime, "long")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">End Time</p>
                    <p className="text-gray-900">
                      {change.endTime
                        ? formatDate(change.endTime, "long")
                        : "No end time"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold">Auto Revert</p>
                    <p className="text-gray-900">
                      {change.autoRevert ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
