import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { ScheduledChange } from "@/types";
import { Clock, Plus, Trash2, AlertCircle } from "lucide-react";
import { formatDate } from "@lib/price-utils";

export default function ScheduledPage() {
  const [changes, setChanges] = useState<ScheduledChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    endTime: "",
    autoRevert: true,
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

    try {
      const response = await axios.post("/api/scheduled-changes", {
        ...formData,
        filters: {},
        action: {},
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
        fetchScheduledChanges();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create scheduled change");
    }
  };

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
          className="flex items-center space-x-2 bg-shopify text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90"
        >
          <Plus className="w-5 h-5" />
          <span>Schedule Change</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Scheduled Change</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g., Black Friday Sale"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
                />
              </div>
            </div>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.autoRevert}
                onChange={(e) =>
                  setFormData({ ...formData, autoRevert: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-gray-700 font-medium">
                Automatically revert prices when end time is reached
              </span>
            </label>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                You'll need to specify which products and prices in the next step after
                creating this schedule.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForm}
                className="flex-1 bg-shopify text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"
              >
                Create Schedule
              </button>
            </div>
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

      {/* Feature Info */}
      <div className="mt-8 bg-gradient-to-r from-shopify/10 to-blue-50 border border-shopify/20 rounded-xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Scheduled Changes Feature
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">✓ Perfect for Sales</h4>
            <p>
              Schedule price changes for specific dates like Black Friday, holiday sales,
              or seasonal promotions.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">✓ Automatic Revert</h4>
            <p>
              Prices automatically revert at your specified end time without manual
              intervention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
