
import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();

  const token = localStorage.getItem("access_token");
  const storedUser = localStorage.getItem("user");

  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  const role = String(user.role || "").toUpperCase();

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.map((item) => item.toUpperCase()).includes(role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;


