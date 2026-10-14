
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import Navbar from "../components/Navbar";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import Dashboard from "../pages/dashboard/Dashboard";
import Devices from "../pages/devices/Devices";
import DeviceDetails from "../pages/devices/DeviceDetails";
import Alerts from "../pages/alerts/Alerts";
import AlertRules from "../pages/alert-rules/AlertRules";
import Maintenance from "../pages/maintenance/Maintenance";
import Notifications from "../pages/notifications/Notifications";
import Sites from "../pages/sites/Sites";
import Users from "../pages/users/Users";

function AppLayout() {
  return (
    <div className="min-h-screen bg-orange-50/30">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated application */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={<Navigate to="/dashboard" replace />}
          />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />

          <Route
            path="/devices/:deviceId"
            element={<DeviceDetails />}
          />

          <Route path="/alerts" element={<Alerts />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Admin-only pages */}
          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/users" element={<Users />} />
            <Route path="/alert-rules" element={<AlertRules />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Route>
      </Route>

      {/* Unknown URLs */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default AppRoutes;



