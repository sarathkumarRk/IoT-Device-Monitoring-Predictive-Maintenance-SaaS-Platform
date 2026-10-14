import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  Cpu,
  Bell,
  ShieldCheck,
  Wrench,
  MapPin,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserRound,
} from "lucide-react";

const navigationByRole = {
  ADMIN: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devices", path: "/devices", icon: Cpu },
    { label: "Alerts", path: "/alerts", icon: Bell },
    { label: "Alert Rules", path: "/alert-rules", icon: ShieldCheck },
    { label: "Maintenance", path: "/maintenance", icon: Wrench },
    { label: "Sites", path: "/sites", icon: MapPin },
    { label: "Notifications", path: "/notifications", icon: Activity },
    { label: "Users", path: "/users", icon: Users },
  ],

  OPERATOR: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devices", path: "/devices", icon: Cpu },
    { label: "Alerts", path: "/alerts", icon: Bell },
    { label: "Maintenance", path: "/maintenance", icon: Wrench },
    { label: "Sites", path: "/sites", icon: MapPin },
    { label: "Notifications", path: "/notifications", icon: Activity },
  ],

  VIEWER: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Devices", path: "/devices", icon: Cpu },
    { label: "Alerts", path: "/alerts", icon: Bell },
    { label: "Sites", path: "/sites", icon: MapPin },
    { label: "Notifications", path: "/notifications", icon: Activity },
  ],
};

function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  let user = null;

  try {
    const storedUser = localStorage.getItem("user");
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  const role = String(user?.role || "").toUpperCase();
  const navigation = navigationByRole[role] || [];

  const displayName = user?.name || user?.email || "User";

  const navLinkClass = ({ isActive }) =>
    [
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-orange-500 text-white"
        : "text-gray-600 hover:bg-orange-50 hover:text-orange-600",
    ].join(" ");

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    closeMenus();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex shrink-0 items-center gap-2"
            aria-label="Go to dashboard"
          >
            <span className="rounded-xl bg-orange-500 p-2 text-white">
              <Activity size={22} />
            </span>

            <span className="text-left">
              <span className="block text-base font-bold text-gray-900">
                IoT Monitor
              </span>
              <span className="block text-xs text-gray-500">
                Device Management
              </span>
            </span>
          </button>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  className={navLinkClass}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="relative hidden shrink-0 lg:block">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50"
              aria-expanded={profileOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <UserRound size={18} />
              </span>

              <span className="max-w-32 text-left">
                <span className="block truncate text-sm font-semibold text-gray-800">
                  {displayName}
                </span>
                <span className="block text-xs text-orange-600">
                  {role || "USER"}
                </span>
              </span>

              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-orange-100 bg-white p-2 shadow-lg">
                <div className="border-b border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="truncate text-sm font-medium text-gray-800">
                    {user?.email || displayName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg border border-orange-100 p-2 text-gray-700 hover:bg-orange-50 lg:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-orange-100 py-4 lg:hidden">
            <div className="mb-3 rounded-lg bg-orange-50 p-3">
              <p className="truncate text-sm font-semibold text-gray-900">
                {displayName}
              </p>
              <p className="mt-1 text-xs font-medium text-orange-600">
                Role: {role || "USER"}
              </p>
            </div>

            <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/dashboard"}
                    onClick={closeMenus}
                    className={navLinkClass}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
