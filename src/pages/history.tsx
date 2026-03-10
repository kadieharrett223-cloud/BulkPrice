import { useEffect, useState } from "react";
import axios from "axios";
import { ActivityLog } from "@/types";
import { formatDate } from "@lib/price-utils";
import { Search, Calendar } from "lucide-react";
import { resolveShop } from "@lib/use-shop";

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const shop = resolveShop();

      if (!shop) {
        setLogs([]);
        return;
      }

      const response = await axios.get(
        `/api/activity-log?limit=${limit}&offset=${(page - 1) * limit}&shop=${encodeURIComponent(shop)}`
      );
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto dashboard-wrapper space-y-8">
      <div className="mb-8">
        <h1 className="section-title font-bold text-gray-900 mb-2">Activity History</h1>
        <p className="body-compact text-gray-600">
          Track all price changes made to your Shopify store
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 relative section-card action-card p-4">
        <div className="icon-pill absolute left-6 top-1/2 transform -translate-y-1/2">
          <Search className="w-5 h-5 text-blue-600" />
        </div>
        <input
          type="text"
          placeholder="Search activity..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Table */}
      <div className="section-card bg-white/85 border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-8 py-12 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-8 py-12 text-center">
            <div className="icon-pill mx-auto mb-3">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <p className="body-compact text-gray-500">No activity history yet</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-blue-50/50 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Details
                  </th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-700">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">
                    Date & Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.details ? (
                        <span className="text-gray-600">{log.details}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {log.affectedCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(log.timestamp, "long")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={filtered.length < limit}
                className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
