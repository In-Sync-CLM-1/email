import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { Navigate } from "react-router-dom";
import { SuspendedOrgGate } from "./SuspendedOrgGate";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin";
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, orgRole, isPlatformAdmin, loading: orgLoading } = useOrg();

  if (authLoading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Platform admins go straight to their dashboard — no org needed
  if (isPlatformAdmin) return <>{children}</>;

  if (!currentOrg) return <Navigate to="/create-org" replace />;

  if (!currentOrg.onboarding_completed) return <Navigate to="/onboarding" replace />;

  // Suspended orgs see payment prompt instead of dashboard
  if (currentOrg.org_status === "suspended") {
    return <SuspendedOrgGate org={currentOrg} />;
  }

  // Check role requirement
  if (requireRole === "admin" && orgRole !== "admin" && !isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">You need admin privileges for this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
