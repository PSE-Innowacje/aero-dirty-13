/**
 * DashboardPage — Redirect to role-appropriate default page.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function DashboardPage() {
  const { user } = useAuth();

  // Admin defaults to user management, others to operations
  if (user?.system_role === "Administrator") {
    return <Navigate to="/users" replace />;
  }
  if (user?.system_role === "Osoba planująca") {
    return <Navigate to="/operations" replace />;
  }
  return <Navigate to="/operations" replace />;
}
