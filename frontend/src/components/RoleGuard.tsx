import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { SYSTEM_ROLE } from "@/lib/constants";

interface RoleGuardProps {
  allowedRoles: string[];
}

/**
 * RoleGuard — layout route wrapper that checks user.system_role against allowedRoles.
 * Unauthorized users are redirected to /operations (Planner's landing) or / (others).
 * Must be nested inside ProtectedRoute (which handles auth loading/redirect).
 */
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const role = user?.system_role ?? "";

  if (!allowedRoles.includes(role)) {
    // Planner lands on /operations; everyone else goes to /
    const fallback = role === SYSTEM_ROLE.PLANNER ? "/operations" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
