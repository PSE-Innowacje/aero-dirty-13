/**
 * DashboardPage — Operational overview of fleet, crew, operations, and orders.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  Users,
  ClipboardList,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react";

/* ── API response shape ──────────────────────────────────────────── */

interface DashboardStats {
  helicopters: {
    total: number;
    active: number;
    inactive: number;
    inspections_expiring_30d: number;
  };
  crew: {
    total: number;
    by_role: Record<string, number>;
    licenses_expiring_30d: number;
    training_expiring_30d: number;
  };
  operations: {
    total: number;
    by_status: Record<string, number>;
  };
  orders: {
    total: number;
    by_status: Record<string, number>;
  };
  safety_alerts: Array<{
    type: string;
    entity: string;
    expiry_date: string;
    severity: "expired" | "expiring";
  }>;
  recent_operations: Array<{
    id: number;
    order_number: string | null;
    status: number;
    planned_date_earliest: string | null;
    short_description: string | null;
  }>;
}

/* ── Status color maps ───────────────────────────────────────────── */

const OPERATION_STATUS_COLOR: Record<number, string> = {
  1: "#48A2CE",
  3: "#4C8832",
  4: "#F2C432",
  6: "#4C8832",
};

const ORDER_STATUS_COLOR: Record<number, string> = {
  1: "#48A2CE",
  2: "#F2C432",
  4: "#4C8832",
  6: "#4C8832",
};

const OPERATION_STATUS_LABEL: Record<number, string> = {
  1: "Wprowadzone",
  2: "Odrzucone",
  3: "Potwierdzone",
  4: "Zaplanowane",
  5: "W realizacji",
  6: "Zrealizowane",
  7: "Rezygnacja",
};

const ORDER_STATUS_LABEL: Record<number, string> = {
  1: "Wprowadzone",
  2: "Do akceptacji",
  3: "Odrzucone",
  4: "Zaakceptowane",
  5: "W rozliczeniu",
  6: "Zrealizowane",
  7: "Niezrealizowane",
};

/* ── Helpers ──────────────────────────────────────────────────────── */

function StatusBar({
  byStatus,
  total,
  colorMap,
  labelMap,
}: {
  byStatus: Record<string, number>;
  total: number;
  colorMap: Record<number, string>;
  labelMap: Record<number, string>;
}) {
  if (total === 0) return null;

  const entries = Object.entries(byStatus)
    .map(([k, v]) => ({ status: Number(k), count: v }))
    .filter((e) => e.count > 0);

  return (
    <div className="mt-3">
      {/* Bar */}
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface">
        {entries.map((e) => (
          <div
            key={e.status}
            style={{
              width: `${(e.count / total) * 100}%`,
              backgroundColor: colorMap[e.status] ?? "#6b7280",
            }}
            title={`${labelMap[e.status] ?? e.status}: ${e.count}`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {entries.map((e) => (
          <span key={e.status} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: colorMap[e.status] ?? "#6b7280" }}
            />
            {labelMap[e.status] ?? e.status}: {e.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function AlertIcon({ type }: { type: string }) {
  switch (type) {
    case "helicopter_inspection":
      return <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />;
    case "pilot_license":
      return <Users className="h-4 w-4 text-muted-foreground shrink-0" />;
    case "training":
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function alertTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case "helicopter_inspection":
      return t("dashboard.helicopterInspection");
    case "pilot_license":
      return t("dashboard.pilotLicense");
    case "training":
      return t("dashboard.training");
    default:
      return type;
  }
}

function operationStatusLabel(status: number): string {
  return OPERATION_STATUS_LABEL[status] ?? `Status ${status}`;
}

/* ── Component ───────────────────────────────────────────────────── */

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["stats"],
    queryFn: () => apiFetch<DashboardStats>("/stats"),
  });

  const recentOps = useMemo(() => stats?.recent_operations ?? [], [stats]);

  /* ---------- Loading state ---------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  /* ---------- Error state ---------- */
  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4">
        <p className="text-sm text-destructive-foreground">
          {t("common.loadingError")}: {error.message}
        </p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="h-1 w-12 bg-[#C00017] mb-2" />
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {/* ── Top row: 4 stat cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Helicopters */}
        <div className="bg-surface-container-low rounded-md p-5 border border-[rgba(72,162,206,0.1)]">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("dashboard.helicopterFleet")}
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.helicopters.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.helicopters.active} {t("dashboard.active")} / {stats.helicopters.inactive} {t("dashboard.inactive")}
          </p>
          {stats.helicopters.inspections_expiring_30d > 0 && (
            <p className="text-xs text-[#F2C432] mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stats.helicopters.inspections_expiring_30d} {t("dashboard.inspectionsExpiring")}
            </p>
          )}
        </div>

        {/* Crew */}
        <div className="bg-surface-container-low rounded-md p-5 border border-[rgba(72,162,206,0.1)]">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("dashboard.crewMembers")}
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.crew.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {Object.entries(stats.crew.by_role)
              .map(([role, count]) => `${count} ${role}`)
              .join(", ")}
          </p>
          {(stats.crew.licenses_expiring_30d > 0 || stats.crew.training_expiring_30d > 0) && (
            <p className="text-xs text-[#F2C432] mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stats.crew.licenses_expiring_30d > 0 &&
                `${stats.crew.licenses_expiring_30d} ${t("dashboard.certificatesExpiring")}`}
              {stats.crew.licenses_expiring_30d > 0 && stats.crew.training_expiring_30d > 0 && ", "}
              {stats.crew.training_expiring_30d > 0 &&
                `${stats.crew.training_expiring_30d} szkol.`}
            </p>
          )}
        </div>

        {/* Operations */}
        <div className="bg-surface-container-low rounded-md p-5 border border-[rgba(72,162,206,0.1)]">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("dashboard.flightOperations")}
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.operations.total}</p>
          <StatusBar
            byStatus={stats.operations.by_status}
            total={stats.operations.total}
            colorMap={OPERATION_STATUS_COLOR}
            labelMap={OPERATION_STATUS_LABEL}
          />
        </div>

        {/* Orders */}
        <div className="bg-surface-container-low rounded-md p-5 border border-[rgba(72,162,206,0.1)]">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("dashboard.flightOrders")}
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.orders.total}</p>
          <StatusBar
            byStatus={stats.orders.by_status}
            total={stats.orders.total}
            colorMap={ORDER_STATUS_COLOR}
            labelMap={ORDER_STATUS_LABEL}
          />
        </div>
      </div>

      {/* ── Bottom row: Alerts + Recent Operations ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Safety Alerts */}
        <div className="bg-surface-container-low rounded-md border border-[rgba(72,162,206,0.1)]">
          <div className="p-5 pb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {t("dashboard.safetyAlerts")}
            </h2>
          </div>
          <div className="px-5 pb-5">
            {stats.safety_alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noAlerts")}</p>
            ) : (
              <ul className="space-y-2">
                {stats.safety_alerts.map((alert, i) => (
                  <li
                    key={`${alert.type}-${alert.entity}-${i}`}
                    className="flex items-start gap-3 p-2 rounded-md bg-surface/50"
                  >
                    <AlertIcon type={alert.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{alertTypeLabel(alert.type, t)}</span>
                        {" — "}
                        <span className="text-muted-foreground">{alert.entity}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{alert.expiry_date}</p>
                    </div>
                    <Badge
                      variant={alert.severity === "expired" ? "destructive" : "default"}
                      className={
                        alert.severity === "expiring"
                          ? "bg-[#F2C432]/20 text-[#F2C432] border border-[#F2C432]/30"
                          : undefined
                      }
                    >
                      {alert.severity === "expired"
                        ? t("dashboard.expired")
                        : t("dashboard.expiringSoon")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Operations */}
        <div className="bg-surface-container-low rounded-md border border-[rgba(72,162,206,0.1)]">
          <div className="p-5 pb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {t("dashboard.recentOperations")}
            </h2>
          </div>
          <div className="px-5 pb-5">
            {recentOps.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noRecentOperations")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(72,162,206,0.1)]">
                      <th className="text-left py-2 pr-3 text-xs text-muted-foreground font-medium">
                        #
                      </th>
                      <th className="text-left py-2 pr-3 text-xs text-muted-foreground font-medium">
                        {t("operations.shortDescription")}
                      </th>
                      <th className="text-left py-2 pr-3 text-xs text-muted-foreground font-medium">
                        {t("common.status")}
                      </th>
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium">
                        {t("operations.plannedDates")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOps.map((op) => (
                      <tr
                        key={op.id}
                        className="border-b border-[rgba(72,162,206,0.05)] hover:bg-surface/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/operations/${op.id}`)}
                      >
                        <td className="py-2 pr-3 text-muted-foreground">{op.id}</td>
                        <td className="py-2 pr-3 text-foreground max-w-[200px] truncate">
                          {op.short_description ?? "\u2014"}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${OPERATION_STATUS_COLOR[op.status] ?? "#6b7280"}20`,
                              color: OPERATION_STATUS_COLOR[op.status] ?? "#6b7280",
                            }}
                          >
                            {operationStatusLabel(op.status)}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {op.planned_date_earliest ?? "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
