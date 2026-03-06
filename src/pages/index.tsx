import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Download,
  Clock,
  DollarSign,
  FileText,
  Package,
  Calendar,
  Zap,
  TrendingUp,
  Eye,
  Copy,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { ActivityLog, ScheduledChange } from "@/types";
import { formatDate } from "@lib/price-utils";

interface DashboardStats {
  productsUpdated: number;
  activeCampaigns: number;
  scheduledChanges: number;
  lastUpdate: string | null;
  totalProducts: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    productsUpdated: 0,
    activeCampaigns: 0,
    scheduledChanges: 0,
    lastUpdate: null,
    totalProducts: 0,
  });
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [upcomingCampaigns, setUpcomingCampaigns] = useState<ScheduledChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [logsResponse, scheduledResponse, productsResponse] = await Promise.all([
        axios.get("/api/activity-log?limit=5"),
        axios.get("/api/scheduled-changes"),
        axios.get("/api/products?limit=1"),
      ]);

      if (logsResponse.data.success) {
        const activityLogs = logsResponse.data.data;
        setLogs(activityLogs);

        // Calculate stats from logs
        const totalUpdated = activityLogs.reduce(
          (sum: number, log: ActivityLog) => sum + (log.affectedCount || 0),
          0
        );
        const lastLog = activityLogs[0];

        setStats((prev) => ({
          ...prev,
          productsUpdated: totalUpdated,
          lastUpdate: lastLog ? lastLog.timestamp : null,
        }));
      }

      if (productsResponse.data.success) {
        const productsTotal = productsResponse.data.data.total || 0;
        setStats((prev) => ({
          ...prev,
          totalProducts: productsTotal,
        }));
      }

      if (scheduledResponse.data.success) {
        const allScheduled = scheduledResponse.data.data;
        const active = allScheduled.filter((c: ScheduledChange) => c.status === "active");
        const upcoming = allScheduled
          .filter((c: ScheduledChange) => c.status === "scheduled")
          .slice(0, 3);

        setStats((prev) => ({
          ...prev,
          activeCampaigns: active.length,
          scheduledChanges: upcoming.length,
        }));
        setUpcomingCampaigns(upcoming);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProducts = async () => {
    if (syncing) return;

    setSyncing(true);
    const toastId = toast.loading("Syncing products from Shopify...");

    try {
      // Get shop from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get("shop") || localStorage.getItem("shopifyShop") || "";

      if (!shop) {
        toast.error("Shop not found. Please complete OAuth first.", { id: toastId });
        return;
      }

      const response = await axios.post("/api/sync-products", { shop });

      if (response.data.success) {
        const { productsSync, variantsSync } = response.data.data;
        toast.success(
          `Synced ${productsSync} products with ${variantsSync} variants!`,
          { id: toastId }
        );
        
        // Refresh dashboard data
        await fetchDashboardData();
      } else {
        toast.error(response.data.error || "Failed to sync products", { id: toastId });
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(
        error.response?.data?.error || "Failed to sync products from Shopify",
        { id: toastId }
      );
    } finally {
      setSyncing(false);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Sync Banner */}
      {stats.totalProducts === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <RefreshCw className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                Sync Your Products First
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                Before you can update prices, you need to sync your products from Shopify. 
                This will import all your products and variants into PricePilot Pro.
              </p>
              <button
                onClick={handleSyncProducts}
                disabled={syncing}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-md font-medium transition"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Syncing Products...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Sync Products from Shopify
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Products in Catalog</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
            </div>
          </div>
          {stats.totalProducts > 0 && (
            <button
              onClick={handleSyncProducts}
              disabled={syncing}
              className="mt-3 text-xs text-blue-600 hover:text-blue-700 disabled:text-blue-400 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Resync"}
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Products Updated</p>
              <p className="text-2xl font-bold text-gray-900">{stats.productsUpdated.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled Changes</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.scheduledChanges} upcoming
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Update</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.lastUpdate ? getTimeAgo(stats.lastUpdate) : "Never"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/bulk-pricing"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-300 transition group"
          >
            <div className="flex items-center gap-2 mb-2 text-gray-900">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Start Bulk Price Update</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Change prices across products instantly
            </p>
            <div className="inline-block mt-4 bg-blue-600 group-hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
              Start
            </div>
          </Link>

          <Link
            href="/scheduled"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-300 transition group"
          >
            <div className="flex items-center gap-2 mb-2 text-gray-900">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Schedule Flash Sale</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Run timed sales with auto-restore
            </p>
            <div className="inline-block mt-4 bg-blue-600 group-hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
              Schedule
            </div>
          </Link>

          <Link
            href="/bulk-pricing"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-300 transition group"
          >
            <div className="flex items-center gap-2 mb-2 text-gray-900">
              <Download className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Import / Export CSV</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Upload or download pricing data
            </p>
            <div className="inline-block mt-4 bg-blue-600 group-hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
              Open CSV Tools
            </div>
          </Link>
        </div>
      </section>

      {/* Upcoming Campaigns */}
      {upcomingCampaigns.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Price Campaigns</h2>
            <Link
              href="/scheduled"
              className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingCampaigns.map((campaign) => (
              <div key={campaign.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{campaign.name}</h3>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Start: {formatDate(campaign.startTime, "long")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>
                      Rule:{" "}
                      {campaign.action.type === "round"
                        ? `Round to ${campaign.action.roundTo}`
                        : `${campaign.action.type.includes("decrease") ? "-" : "+"}${
                            campaign.action.value
                          }${campaign.action.type.includes("percentage") ? "%" : "$"}`}
                    </span>
                  </div>
                </div>
                <Link
                  href="/scheduled"
                  className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View details →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Jobs */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Price Jobs</h2>
          <Link
            href="/history"
            className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            View full history
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading recent jobs...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No price changes yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Start your first bulk update to change prices across your store
            </p>
            <Link
              href="/bulk-pricing"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md text-sm font-medium"
            >
              Start Bulk Update
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-sm text-gray-500 border-b">
                <tr>
                  <th className="py-3 pr-4 font-medium">Campaign</th>
                  <th className="py-3 px-4 font-medium">Rule</th>
                  <th className="py-3 px-4 font-medium text-right">Products</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Time</th>
                  <th className="py-3 pl-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-4 text-gray-900 font-medium">{log.action}</td>
                    <td className="py-3 px-4 text-gray-600">{log.details || "—"}</td>
                    <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                      {log.affectedCount}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">
                      {getTimeAgo(log.timestamp)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {log.changeGroupId && (
                          <button
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Rollback"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Activity Feed */}
      {logs.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-900">
                    <span className="font-medium">{log.action}</span> applied to{" "}
                    <span className="font-semibold">{log.affectedCount}</span> products
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">{getTimeAgo(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
