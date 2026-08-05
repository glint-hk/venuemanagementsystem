import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import ApprovalsPage from "./pages/ApprovalsPage.jsx";
import PublicBoardPage from "./pages/PublicBoardPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import AdminVenuesPage from "./pages/AdminVenuesPage.jsx";
import AdminOverviewPage from "./pages/AdminOverviewPage.jsx";
import { getRoleHome } from "./lib/roleHome.js";
import { Spinner } from "./components/ui/Spinner.jsx";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" label="Loading account details…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={getRoleHome(user.role)} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user && !loading ? <Navigate to={getRoleHome(user.role)} replace /> : <LoginPage />} />
      <Route path="/availability" element={<PublicBoardPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute roles={["APPROVER", "ADMIN"]}><ApprovalsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminOverviewPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={["ADMIN"]}><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/venues" element={<ProtectedRoute roles={["ADMIN"]}><AdminVenuesPage /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to={user ? getRoleHome(user.role) : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}