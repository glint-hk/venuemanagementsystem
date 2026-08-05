import { useState, useEffect } from "react";
import { fetchUsers, elevateRole } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";
import { Button, Card, Badge, Modal, Spinner } from "../components/ui/index.js";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [roleForm, setRoleForm] = useState({ role: "BOOKER", approverTier: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleElevate = async (e) => {
    e.preventDefault();
    setError("");
    if (roleForm.role === "APPROVER" && !roleForm.approverTier) {
      setError("Approver tier is required");
      return;
    }
    setSubmitting(true);
    try {
      await elevateRole(
        editing.id,
        roleForm.role,
        roleForm.role === "APPROVER" ? parseInt(roleForm.approverTier, 10) : null
      );
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">{error}</div>
        )}

        {loading ? (
          <Spinner label="Loading user directory…" />
        ) : (
          <Card hover={false} className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-4 text-blue-200/60 font-medium">Name</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Email</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Role</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Tier</th>
                  <th className="text-right p-4 text-blue-200/60 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-4 text-white font-medium">{u.name}</td>
                    <td className="p-4 text-blue-200/60">{u.email}</td>
                    <td className="p-4">
                      <Badge status={u.role} />
                    </td>
                    <td className="p-4 text-blue-200/60 font-mono">{u.approverTier ?? "—"}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(u);
                          setRoleForm({ role: u.role, approverTier: u.approverTier || "" });
                        }}
                      >
                        Edit Role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Modal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          title={`Edit Role: ${editing?.name}`}
        >
          {editing && (
            <form onSubmit={handleElevate} id="elevate-form" className="space-y-4">
              <div>
                <label htmlFor="role-select" className="block text-sm text-blue-100 mb-1">Role</label>
                <select
                  id="role-select"
                  value={roleForm.role}
                  onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="BOOKER">Booker</option>
                  <option value="APPROVER">Approver</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {roleForm.role === "APPROVER" && (
                <div>
                  <label htmlFor="tier-input" className="block text-sm text-blue-100 mb-1">
                    Approver Tier <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="tier-input"
                    type="number"
                    min="1"
                    value={roleForm.approverTier}
                    onChange={(e) => setRoleForm({ ...roleForm, approverTier: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setEditing(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
