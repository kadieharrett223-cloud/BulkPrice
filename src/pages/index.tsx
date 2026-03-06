import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  TrendingUp,
  History,
  Clock,
  Settings,
  BarChart3,
} from "lucide-react";
import { ActivityLog } from "@/types";

export default function Dashboard() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityLog();
  }, []);

  const fetchActivityLog = async () => {
    try {
      const response = await axios.get("/api/activity-log?limit=5");
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching activity log:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">
          Schedule Flash Sales with BulkPrice
        </h1>
        <p className="text-xl text-gray-600">
          Apply bulk price changes or discounts with filters and rollback. Run
          scheduled flash sales with automatic price revert across high-variant,
          large-catalog stores.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link
          href="/bulk-pricing"
          className="group bg-gradient-to-br from-shopify to-shopify/80 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 group-hover:bg-opacity-30 transition-all">
              <TrendingUp className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Bulk Edit Prices</h3>
          <p className="text-white/80">
            Change prices by %, fixed amount, or exact value with flexible rounding
          </p>
        </Link>

        <Link
          href="/scheduled"
          className="group bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 group-hover:bg-opacity-30 transition-all">
              <Clock className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Schedule Changes</h3>
          <p className="text-white/80">
            Schedule flash sales with start/end dates and automatic rollback
          </p>
        </Link>

        <Link
          href="/history"
          className="group bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-8 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 group-hover:bg-opacity-30 transition-all">
              <History className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          <h3 className="text-2xl font-bold mb-2">View History</h3>
          <p className="text-white/80">
            See all price changes and activity logs for your store
          </p>
        </Link>
      </div>

      {/* Features Overview */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "🔢",
              title: "Simple Bulk Changes",
              description: "Percentage, fixed amount, or exact prices",
            },
            {
              icon: "🎯",
              title: "Smart Filtering",
              description: "Filter by collection, vendor, inventory, product status, tags, or price",
            },
            {
              icon: "👁️",
              title: "Preview Before Apply",
              description: "See all changes in a detailed table before confirming",
            },
            {
              icon: "↩️",
              title: "Instant Rollback",
              description: "Undo price changes up to 30 days later",
            },
            {
              icon: "📅",
              title: "Scheduled Changes",
              description: "Plan sales and promotions with automatic revert",
            },
            {
              icon: "💾",
              title: "CSV Import/Export",
              description: "Download prices spreadsheet or upload bulk edits",
            },
            {
              icon: "💲",
              title: "Compare-at Prices",
              description: "Edit sale prices and compare-at prices together",
            },
            {
              icon: "📊",
              title: "Variants Support",
              description: "Works reliably across large catalogs and high variant counts",
            },
            {
              icon: "📈",
              title: "Activity Log",
              description: "Track all price changes with dates and details",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md">
        <div className="px-8 py-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
        </div>
        {loading ? (
          <div className="px-8 py-12 text-center text-gray-500">
            Loading activity...
          </div>
        ) : logs.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <p className="text-gray-500 mb-4">No activity yet</p>
            <Link href="/bulk-pricing" className="text-shopify hover:text-shopify/80 font-semibold">
              Make your first bulk price change →
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div
                key={log.id}
                className="px-8 py-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{log.action}</p>
                  {log.details && (
                    <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {log.affectedCount} products
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA for Setup */}
      <div className="mt-12 bg-gradient-to-r from-shopify/10 to-blue-50 border border-shopify/20 rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Get Started in Seconds
        </h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Configure your Shopify API credentials and start managing prices right away.
          All changes are safe and reversible.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/bulk-pricing"
            className="btn-primary"
          >
            Start Editing Now →
          </Link>
          <Link
            href="/settings"
            className="btn-secondary"
          >
            Configure Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
