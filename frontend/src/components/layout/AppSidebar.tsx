/**
 * AppSidebar — AERO Design System dark sidebar with surface hierarchy.
 * RBAC-filtered menu groups per PRD 7.1/7.2.
 * Uses surface-container-low for sidebar bg, no borders — depth via tonal shift.
 */
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  Settings,
  ClipboardList,
  FileText,
  LogOut,
  Users,
  MapPin,
  UserCog,
  Navigation,
  ChevronLeft,
  Menu,
  Globe,
  Sun,
  Moon,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SYSTEM_ROLE } from "@/lib/constants";

/* ── Menu structure per PRD 7.1 ────────────────────────────── */
interface MenuItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

interface MenuGroup {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  items: MenuItem[];
}

/** Static menu structure — labels are translation keys, resolved at render time. */
const ALL_MENU_GROUPS: MenuGroup[] = [
  {
    id: "dashboard",
    labelKey: "sidebar.dashboard",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard", labelKey: "sidebar.dashboardLink", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    id: "admin",
    labelKey: "sidebar.admin",
    icon: Settings,
    items: [
      { id: "helicopters", labelKey: "sidebar.helicopters", href: "/helicopters", icon: Navigation },
      { id: "crew", labelKey: "sidebar.crewMembers", href: "/crew", icon: UserCog },
      { id: "landing-sites", labelKey: "sidebar.landingSites", href: "/landing-sites", icon: MapPin },
      { id: "users", labelKey: "sidebar.users", href: "/users", icon: Users },
    ],
  },
  {
    id: "operations",
    labelKey: "sidebar.operations",
    icon: ClipboardList,
    items: [
      { id: "operations-list", labelKey: "sidebar.operationsList", href: "/operations", icon: ClipboardList },
    ],
  },
  {
    id: "orders",
    labelKey: "sidebar.orders",
    icon: FileText,
    items: [
      { id: "orders-list", labelKey: "sidebar.ordersList", href: "/orders", icon: FileText },
    ],
  },
];

/* ── RBAC filtering per PRD 7.2 — uses stable group ids ────── */
type RoleKey = typeof SYSTEM_ROLE[keyof typeof SYSTEM_ROLE];

const ROLE_ALLOWED_GROUPS: Record<RoleKey, string[]> = {
  [SYSTEM_ROLE.ADMIN]: ["dashboard", "admin", "operations", "orders"],
  [SYSTEM_ROLE.PLANNER]: ["dashboard", "operations"],
  [SYSTEM_ROLE.SUPERVISOR]: ["dashboard", "admin", "operations", "orders"],
  [SYSTEM_ROLE.PILOT]: ["dashboard", "admin", "operations", "orders"],
};

function getMenuForRole(role: string): MenuGroup[] {
  const allowed = ROLE_ALLOWED_GROUPS[role as RoleKey];
  if (!allowed) return [];

  return ALL_MENU_GROUPS.filter((g) => allowed.includes(g.id));
}

/* ── Sidebar component ────────────────────────────────────── */

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const menuGroups = getMenuForRole(user?.system_role ?? "");

  const currentLang = i18n.language;
  const toggleLanguage = () => {
    const next = currentLang === "pl" ? "en" : "pl";
    i18n.changeLanguage(next);
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-surface-container-low text-on-surface-variant transition-all duration-200 shadow-[1px_0_0_0_rgba(72,162,206,0.08),4px_0_24px_-4px_rgba(0,20,41,0.5)] border-r border-r-[#48A2CE]/20",
        "md:relative md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed && !mobileOpen ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">AERO</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {menuGroups.map((group) => (
          <div key={group.id} className="mb-6">
            {!collapsed && (
              <div className="mb-2 flex items-center gap-2 px-2">
                <group.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.labelKey)}
                </span>
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      title={collapsed ? t(item.labelKey) : undefined}
                      onClick={() => onMobileClose?.()}
                      className={cn(
                        "flex items-center gap-3 rounded-sm px-2 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent/10 text-foreground relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-full before:bg-accent border-l-2 border-l-accent shadow-[0_0_8px_rgba(72,162,206,0.15)]"
                          : "text-on-surface-variant hover:bg-surface-container/50 hover:text-foreground",
                        collapsed && "justify-center"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                      {!collapsed && <span>{t(item.labelKey)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — user info + language toggle + logout */}
      <div className="p-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.system_role}</p>
          </div>
        )}

        {/* Language switcher */}
        <button
          onClick={toggleLanguage}
          title={currentLang === "pl" ? t("language.en") : t("language.pl")}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          <Globe className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span>{currentLang === "pl" ? "EN" : "PL"}</span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? t("theme.light") : t("theme.dark")}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && (
            <span>{theme === "dark" ? t("theme.light") : t("theme.dark")}</span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title={t("sidebar.logout")}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t("sidebar.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
