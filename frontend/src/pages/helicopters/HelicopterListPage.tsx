/**
 * HelicopterListPage — List helicopters with RBAC-filtered actions.
 * Sorted by status (aktywny first) then registration_number.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { HELICOPTER_STATUS_BADGE_VARIANT, HELICOPTER_STATUS_DISPLAY_KEY, SYSTEM_ROLE } from "@/lib/constants";

interface Helicopter {
  id: number;
  registration_number: string;
  helicopter_type: string;
  description: string | null;
  max_crew: number;
  max_payload_weight: number;
  status: string;
  inspection_date: string | null;
  range_km: number;
}

export function HelicopterListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.system_role === SYSTEM_ROLE.ADMIN;
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Helicopter | null>(null);

  const { data: helicopters = [], isLoading, error } = useQuery<Helicopter[]>({
    queryKey: ["helicopters"],
    queryFn: () => apiFetch<Helicopter[]>("/helicopters"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/helicopters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helicopters"] });
      setDeleteTarget(null);
    },
  });

  // Sort: aktywny first, then by registration_number
  const sorted = [...helicopters].sort((a, b) => {
    const statusOrder = a.status === "aktywny" ? 0 : 1;
    const statusOrderB = b.status === "aktywny" ? 0 : 1;
    if (statusOrder !== statusOrderB) return statusOrder - statusOrderB;
    return a.registration_number.localeCompare(b.registration_number);
  });

  // Summary stats computed from the existing helicopters data
  const { activeCount, inactiveCount, inspectionsExpiring } = useMemo(() => {
    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let active = 0;
    let inactive = 0;
    let expiring = 0;
    for (const h of helicopters) {
      if (h.status === "aktywny") {
        active++;
      } else {
        inactive++;
      }
      if (h.inspection_date) {
        const d = new Date(h.inspection_date);
        if (d <= in30d && d >= now) {
          expiring++;
        }
      }
    }
    return { activeCount: active, inactiveCount: inactive, inspectionsExpiring: expiring };
  }, [helicopters]);

  const columns: DataTableColumn<Helicopter>[] = [
    {
      key: "registration_number",
      header: t('helicopters.registrationNumber'),
      render: (h) => <span className="font-medium">{h.registration_number}</span>,
      sortable: true,
      sortFn: (a, b) => a.registration_number.localeCompare(b.registration_number),
    },
    {
      key: "type",
      header: t('helicopters.type'),
      render: (h) => h.helicopter_type,
      sortable: true,
      sortFn: (a, b) => a.helicopter_type.localeCompare(b.helicopter_type),
    },
    {
      key: "status",
      header: t('common.status'),
      render: (h) => (
        <Badge variant={HELICOPTER_STATUS_BADGE_VARIANT[h.status] ?? "secondary"}>
          {t(HELICOPTER_STATUS_DISPLAY_KEY[h.status] ?? h.status)}
        </Badge>
      ),
      sortable: true,
      sortFn: (a, b) => a.status.localeCompare(b.status),
    },
    {
      key: "inspection_date",
      header: t('helicopters.inspectionDate'),
      render: (h) => h.inspection_date ?? "\u2014",
      sortable: true,
      sortFn: (a, b) => (a.inspection_date ?? "").localeCompare(b.inspection_date ?? ""),
    },
    {
      key: "range_km",
      header: t('helicopters.rangeKm'),
      render: (h) => h.range_km,
      sortable: true,
      sortFn: (a, b) => a.range_km - b.range_km,
    },
  ];

  return (
    <>
      {/* Fleet Summary */}
      {!isLoading && helicopters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-container-low rounded-md p-4 border-l-[3px] border-l-[#4C8832]">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('helicopters.statusActive')}</p>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          </div>
          <div className="bg-surface-container-low rounded-md p-4 border-l-[3px] border-l-[#8899aa]">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('helicopters.statusInactive')}</p>
            <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
          </div>
          <div className="bg-surface-container-low rounded-md p-4 border-l-[3px] border-l-[#F2C432]">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('helicopters.inspectionsExpiring')}</p>
            <p className="text-2xl font-bold text-foreground">{inspectionsExpiring}</p>
          </div>
        </div>
      )}

      <DataTable<Helicopter>
        title={t('helicopters.title')}
        subtitle={t('helicopters.subtitle')}
        columns={columns}
        data={sorted}
        isLoading={isLoading}
        error={error}
        loadingMessage={t('helicopters.loading')}
        errorMessage={t('common.loadingError')}
        emptyMessage={t('helicopters.noHelicopters')}
        addButton={isAdmin ? { href: "/helicopters/new", label: t('helicopters.addHelicopter') } : undefined}
        rowKey={(h) => h.id}
        actionsHeader={t('common.actions')}
        actions={isAdmin ? (h) => (
          <div className="flex justify-end gap-1">
            <Link to={`/helicopters/${h.id}/edit`} title={t('common.edit')}>
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(h)}
              title={t('common.delete')}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : undefined}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
        description={
          <>
            {t('helicopters.confirmDeleteMsg')}{" "}
            <strong>{deleteTarget?.registration_number}</strong> ({deleteTarget?.helicopter_type})?
            {" "}{t('common.cannotUndo')}
          </>
        }
      />
    </>
  );
}
