import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Badge } from "./ui/Badge.jsx";

const NAV_ITEMS = {
  BOOKER: [
    { to: "/dashboard", label: "My Bookings", icon: "📋" },
    { to: "/search", label: "Search Venues", icon: "🔍" },
  ],
  APPROVER: [
    { to: "/dashboard", label: "My Bookings", icon: "📋" },
    { to: "/search", label: "Search Venues", icon: "🔍" },
    { to: "/approvals", label: "Approvals", icon: "✅" },
  ],
  ADMIN: [
    { to: "/admin/venues", label: "Venue Management", icon: "✅" },
    { to: "/admin", label: "Admin", icon: "⚙️" },
    { to: "/admin/users", label: "Users", icon: "👥" },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.BOOKER;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 backdrop-blur-xl bg-white/5 text-white sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏛</span>
          <div>
            <h2 className="font-bold text-sm">Venue Booking</h2>
            <p className="text-blue-300/50 text-xs">{user?.name} ({user?.role})</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-blue-200 hover:text-white rounded-lg border border-white/10"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 border-r border-white/10 backdrop-blur-xl bg-slate-900/95 md:bg-white/5 flex flex-col transition-all duration-300 fixed md:static inset-y-0 left-0 z-50 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">🏛</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Venue Booking</h2>
              <p className="text-blue-300/50 text-xs">IIM Lucknow</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-blue-300 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin" || item.to === "/dashboard"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600/30 text-white border border-blue-500/30 font-medium shadow-sm"
                    : "text-blue-200/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge status={user?.role} className="text-[10px] py-0 px-1.5" />
                {user?.approverTier && (
                  <span className="text-[10px] text-blue-300/60 font-mono">T{user.approverTier}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            id="logout-btn"
            className="w-full px-3 py-1.5 text-sm text-red-300/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
