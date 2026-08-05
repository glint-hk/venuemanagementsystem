import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchVenues, fetchUsers, fetchAuditLogs } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";
import { Card, Spinner } from "../components/ui/index.js";

export default function AdminOverviewPage() {
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [venuesData, usersData, logsData] = await Promise.all([
        fetchVenues(),
        fetchUsers(),
        fetchAuditLogs().catch(() => []),
      ]);
      // GET /api/venues wraps its payload as { venues: [...] }, unlike
      // /api/users and /api/audit-logs which return bare arrays — unwrap it
      // here. Array.isArray guard keeps this safe even if the response
      // shape ever changes or the request partially fails.
      const venuesList = Array.isArray(venuesData) ? venuesData : venuesData?.venues;
      setVenues(Array.isArray(venuesList) ? venuesList : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setAuditLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approverCount = users.filter((u) => u.role === "APPROVER").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const bookerCount = users.filter((u) => u.role === "BOOKER").length;

  const fmtTime = (dt) => new Date(dt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Hub</h1>
          <p className="text-blue-200/60 mt-1">
            System overview, venue registry, audit trail, and user management
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <Spinner label="Loading administration overview…" />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card hover={false}>
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Total Venues
                </p>
                <h3 className="text-3xl font-bold text-white mt-1">{venues.length}</h3>
                <p className="text-blue-300/40 text-xs mt-2">Active campus spaces</p>
              </Card>

              <Card hover={false}>
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Registered Users
                </p>
                <h3 className="text-3xl font-bold text-white mt-1">{users.length}</h3>
                <p className="text-blue-300/40 text-xs mt-2">
                  {bookerCount} Bookers &middot; {approverCount} Approvers
                </p>
              </Card>

              <Card hover={false}>
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Approver Tiers
                </p>
                <h3 className="text-3xl font-bold text-amber-400 mt-1">{approverCount}</h3>
                <p className="text-blue-300/40 text-xs mt-2">Tier 1 & Tier 2 active</p>
              </Card>

              <Card hover={false}>
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Administrators
                </p>
                <h3 className="text-3xl font-bold text-purple-400 mt-1">{adminCount}</h3>
                <p className="text-blue-300/40 text-xs mt-2">Full elevated control</p>
              </Card>
            </div>

            {/* Quick Nav Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/admin/users">
                <Card className="hover:border-blue-500/40 group cursor-pointer p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      👥
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition">
                        User & Role Management
                      </h3>
                      <p className="text-blue-200/60 text-sm mt-1">
                        Elevate users to Approvers or Admins and configure tiers.
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link to="/admin/venues">
                <Card className="hover:border-emerald-500/40 group cursor-pointer p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🏢
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                        Venue Management
                      </h3>
                      <p className="text-blue-200/60 text-sm mt-1">
                        Add, edit, or remove campus venues and their approval chains.
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>

            {/* System Audit Log Feed */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">System Audit Log Feed</h2>
              <Card hover={false}>
                {auditLogs.length === 0 ? (
                  <p className="text-blue-200/50 text-sm italic">No system audit logs recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 text-sm gap-2"
                      >
                        <div>
                          <span className="font-semibold text-blue-300">{log.action}</span>
                          <span className="text-blue-200/60 ml-2">by {log.actor?.name || "System"}</span>
                          {log.metadata && (
                            <p className="text-xs text-blue-300/60 mt-0.5 font-mono">
                              {JSON.stringify(log.metadata)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-blue-300/40 whitespace-nowrap">
                          {fmtTime(log.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Venue Registry Summary Table */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Campus Venue Registry</h2>
              <Card hover={false} className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left p-4 text-blue-200/60 font-medium">Venue Name</th>
                      <th className="text-left p-4 text-blue-200/60 font-medium">Location</th>
                      <th className="text-left p-4 text-blue-200/60 font-medium">Capacity</th>
                      <th className="text-left p-4 text-blue-200/60 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venues.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-blue-200/50 text-sm italic">
                          No venues registered yet.
                        </td>
                      </tr>
                    ) : (
                      venues.map((v) => (
                        <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="p-4 text-white font-medium">{v.name}</td>
                          <td className="p-4 text-blue-200/60">📍 {v.location}</td>
                          <td className="p-4 text-blue-200/60">👥 {v.capacity} seats</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                              {v.type}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}