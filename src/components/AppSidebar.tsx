import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  Building2,
  FileText,
  Wallet,
  Zap,
  Code,
  BarChart3,
  ScrollText,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { currentOrg, orgRole, isPlatformAdmin } = useOrg();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = orgRole === "admin" || isPlatformAdmin;
  const hasOrg = !!currentOrg;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ...(hasOrg ? [
      { to: "/contacts", icon: Users, label: "Contacts" },
      { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
      { to: "/templates", icon: FileText, label: "Templates" },
      { to: "/automations", icon: Zap, label: "Automations" },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/developers", icon: Code, label: "Developers" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ] : []),
    ...(isAdmin && hasOrg ? [{ to: "/billing", icon: Wallet, label: "Billing" }] : []),
    ...(isAdmin && hasOrg ? [{ to: "/users", icon: ShieldCheck, label: "User Management" }] : []),
    ...(isAdmin && hasOrg ? [{ to: "/audit-log", icon: ScrollText, label: "Audit Log" }] : []),
    ...(isAdmin && hasOrg ? [{ to: "/dpdp", icon: ShieldCheck, label: "DPDP Compliance" }] : []),
    ...(isAdmin && hasOrg ? [{ to: "/org-settings", icon: Building2, label: "Org Settings" }] : []),
  ];

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <Mail className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg font-bold tracking-tight text-sidebar-primary-foreground">
            In-Sync
          </span>
        </div>
        {/* Close button on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-sidebar-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Org Switcher */}
      <div className="shrink-0 border-b border-sidebar-border px-3 py-2">
        <OrgSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — always pinned at bottom */}
      <div className="shrink-0 border-t border-sidebar-border p-4">
        <p className="mb-2 truncate text-xs text-sidebar-foreground/60">
          {user?.user_metadata?.full_name || user?.email}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-background shadow-md"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile by default, slide in when open */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
