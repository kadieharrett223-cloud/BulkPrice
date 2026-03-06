import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Download,
  Clock,
  DollarSign,
  FileText,
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
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2 text-gray-900">
              <DollarSign className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Start Bulk Price Update</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Quickly change prices across filtered products.</p>
            <Link href="/bulk-pricing" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
              Start
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2 text-gray-900">
              <Clock className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Schedule Flash Sale</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Create timed price updates with automatic restore.</p>
            <Link href="/scheduled" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
              Schedule
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-2 text-gray-900">
              <Download className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Import / Export CSV</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Upload or download bulk price edits for large catalogs.</p>
            <Link href="/bulk-pricing" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
              Open CSV Tools
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
          <Link href="/history" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            <FileText className="w-4 h-4" />
            View full history
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading recent jobs...</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No jobs yet. Start your first update from Bulk Pricing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-sm text-gray-500 border-b">
                <tr>
                  <th className="py-3 pr-4 font-medium">Job</th>
                  <th className="py-3 px-4 font-medium">Rule</th>
                  <th className="py-3 px-4 font-medium text-right">Products</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 pl-4 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="py-3 pr-4 text-gray-900">{log.action}</td>
                    <td className="py-3 px-4 text-gray-600">{log.details || "Price update"}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{log.affectedCount}</td>
                    <td className="py-3 px-4 text-green-600">Completed</td>
                    <td className="py-3 pl-4 text-right text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
