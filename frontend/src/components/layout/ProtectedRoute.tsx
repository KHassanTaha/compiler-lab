import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Spinner } from "./../ui/Skeleton";

/** Gates a route behind a valid session; remembers where the user was headed. */
export function ProtectedRoute() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

/** Gates a route behind the admin role. Non-admins are sent to their history. */
export function AdminRoute() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/workspace" replace />;
  return <Outlet />;
}
