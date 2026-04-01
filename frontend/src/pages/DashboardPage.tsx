/**
 * DashboardPage — Redirect to role-appropriate default page.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { SYSTEM_ROLE } from "@/lib/constants";

export function DashboardPage() {
  const { user } = useAuth();

  // Admin defaults to user management, others to operations
  if (user?.system_role === SYSTEM_ROLE.ADMIN) {
    return <Navigate to="/users" replace />;
  }
  if (user?.system_role === SYSTEM_ROLE.PLANNER) {
    return <Navigate to="/operations" replace />;
  }
  return <Navigate to="/operations" replace />;
}
