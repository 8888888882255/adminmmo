import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const isLoggedIn =
    localStorage.getItem("adminEmail") || sessionStorage.getItem("adminEmail");

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
