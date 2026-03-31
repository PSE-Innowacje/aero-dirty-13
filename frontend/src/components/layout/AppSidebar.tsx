/**
 * AppSidebar — Dark sidebar with AERO branding, RBAC-filtered menu groups per PRD 7.1/7.2.
 */
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Menu structure per PRD 7.1 ────────────────────────────── */
interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface MenuGroup {
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
}

const ALL_MENU_GROUPS: MenuGroup[] = [
  {
    label: "Administracja",
    icon: Settings,
    items: [
      { label: "Helikoptery", href: "/helicopters", icon: Navigation },
      { label: "Członkowie załogi", href: "/crew", icon: UserCog },
      { label: "Lądowiska planowe", href: "/landing-sites", icon: MapPin },
      { label: "Użytkownicy", href: "/users", icon: Users },
    ],
  },
  {
    label: "Planowanie operacji",
    icon: ClipboardList,
    items: [
      { label: "Lista operacji", href: "/operations", icon: ClipboardList },
    ],
  },
  {
    label: "Zlecenia na lot",
    icon: FileText,
    items: [
      { label: "Lista zleceń", href: "/orders", icon: FileText },
    ],
  },
];

/* ── RBAC filtering per PRD 7.2 ────────────────────────────── */
type RoleKey = "Administrator" | "Osoba planująca" | "Osoba nadzorująca" | "Pilot";

const ROLE_ALLOWED_GROUPS: Record<RoleKey, string[]> = {
  "Administrator": ["Administracja", "Planowanie operacji", "Zlecenia na lot"],
  "Osoba planująca": ["Planowanie operacji"],
  "Osoba nadzorująca": ["Administracja", "Planowanie operacji", "Zlecenia na lot"],
  "Pilot": ["Administracja", "Planowanie operacji", "Zlecenia na lot"],
};

function getMenuForRole(role: string): MenuGroup[] {
  const allowed = ROLE_ALLOWED_GROUPS[role as RoleKey];
  if (!allowed) return [];

  return ALL_MENU_GROUPS.filter((g) => allowed.includes(g.label)).map((group) => {
    // Administracja: only Użytkownicy for Admin (full CRUD) — others see view links minus Użytkownicy
    if (group.label === "Administracja" && role !== "Administrator") {
      return {
        ...group,
        items: group.items.filter((item) => item.label !== "Użytkownicy"),
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
  const location = useLocation();
  const menuGroups = getMenuForRole(user?.system_role ?? "");

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <Plane className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">AERO</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-6">
            {!collapsed && (
              <div className="mb-2 flex items-center gap-2 px-2">
                <group.icon className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
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
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                        collapsed && "justify-center"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — user info + logout */}
      <div className="border-t border-slate-800 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium text-white">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.system_role}</p>
          </div>
        )}
        <button
          onClick={logout}
          title="Wyloguj"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Wyloguj</span>}
        </button>
      </div>
    </aside>
  );
}
