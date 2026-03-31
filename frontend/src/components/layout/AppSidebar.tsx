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
  Plane,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
type RoleKey = "Administrator" | "Osoba planująca" | "Osoba nadzorująca" | "Pilot";

const ROLE_ALLOWED_GROUPS: Record<RoleKey, string[]> = {
  "Administrator": ["admin", "operations", "orders"],
  "Osoba planująca": ["operations"],
  "Osoba nadzorująca": ["admin", "operations", "orders"],
  "Pilot": ["admin", "operations", "orders"],
};

function getMenuForRole(role: string): MenuGroup[] {
  const allowed = ROLE_ALLOWED_GROUPS[role as RoleKey];
  if (!allowed) return [];

  return ALL_MENU_GROUPS.filter((g) => allowed.includes(g.id)).map((group) => {
    if (group.id === "admin" && role !== "Administrator") {
      return {
        ...group,
        items: group.items.filter((item) => item.id !== "users"),
      };
    }
    return group;
  });
}

/* ── Sidebar component ────────────────────────────────────── */

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
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
        "flex h-screen flex-col bg-surface-container-low text-on-surface-variant transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-gradient-to-br from-primary to-primary-container">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">{t("sidebar.brand")}</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
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
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      title={collapsed ? t(item.labelKey) : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-sm px-2 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-surface-container-high text-foreground"
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
