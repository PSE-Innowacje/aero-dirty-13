/**
 * AppLayout — AERO Design System layout shell.
 * Surface-based sidebar sits against surface background content area.
 * No border between them — depth via tonal shift per "No-Line" rule.
 */
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";

const STORAGE_KEY = "aero-sidebar-collapsed";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <AppSidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
