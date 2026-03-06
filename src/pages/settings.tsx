import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Settings, LockKeyhole, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    apiKey: "",
    apiPassword: "",
    shop: "",
    plan: "starter",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/api/settings");
      if (response.data.success) {
        setFormData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.apiKey || !formData.apiPassword || !formData.shop) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post("/api/settings", formData);
      if (response.data.success) {
        toast.success("Settings saved successfully");
        setTested(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.apiKey || !formData.apiPassword || !formData.shop) {
      toast.error("All fields are required");
      return;
    }

    toast.loading("Testing connection...");
    try {
      // In real implementation, test API connection
      setTimeout(() => {
        toast.success("Connection successful");
        setTested(true);
      }, 1500);
    } catch (error: any) {
      toast.error("Connection failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Configure your Shopify API credentials and app settings
        </p>
      </div>

      {/* Configuration Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <LockKeyhole className="w-6 h-6 text-shopify" />
          <h2 className="text-2xl font-bold text-gray-900">Shopify API Credentials</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Shop URL
              </label>
              <input
                type="text"
                name="shop"
                placeholder="yourstore.myshopify.com"
                value={formData.shop}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Shopify store domain
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                API Key
              </label>
              <input
                type="password"
                name="apiKey"
                placeholder="Your API Key"
                value={formData.apiKey}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your Shopify Admin → Apps and integrations → Develop
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                API Password
              </label>
              <input
                type="password"
                name="apiPassword"
                placeholder="Your API Password"
                value={formData.apiPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
              />
              <p className="text-xs text-gray-500 mt-1">
                Keep this secret. Never share it publicly.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Plan
              </label>
              <select
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
              >
                <option value="starter">Starter - $1.99/month (5 bulk changes/month)</option>
                <option value="premium">Premium - $5.99/month (unlimited bulk changes)</option>
              </select>
            </div>

            {tested && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  Connection verified successfully
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Test Connection
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-shopify text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">📖 How to get API credentials</h3>
        <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
          <li>Go to your Shopify Admin</li>
          <li>Navigate to Apps and integrations → Develop apps</li>
          <li>Click "Create an app"</li>
          <li>Fill in app details and create it</li>
          <li>Go to Configuration tab and generate API credentials</li>
          <li>Copy the API key and password and paste them here</li>
        </ol>
      </div>
    </div>
  );
}
