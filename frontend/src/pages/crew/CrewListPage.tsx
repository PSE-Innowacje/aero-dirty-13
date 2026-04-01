/**
 * CrewListPage — List crew members with RBAC-filtered actions.
 * Sorted by email (alphabetical).
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
import { CREW_ROLE_BADGE_VARIANT, CREW_ROLE_DISPLAY_KEY, CREW_ROLE, SYSTEM_ROLE } from "@/lib/constants";

interface CrewMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  weight: number;
  role: string;
  pilot_license_number: string | null;
  pilot_license_expiry: string | null;
  training_expiry: string;
}

export function CrewListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.system_role === SYSTEM_ROLE.ADMIN;
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<CrewMember | null>(null);

  const { data: crew = [], isLoading, error } = useQuery<CrewMember[]>({
    queryKey: ["crew"],
    queryFn: () => apiFetch<CrewMember[]>("/crew-members"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/crew-members/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew"] });
      setDeleteTarget(null);
    },
  });

  // Sort by email
  const sorted = [...crew].sort((a, b) => a.email.localeCompare(b.email));

  // Summary stats computed from the existing crew data
  const { pilotCount, observerCount, mechanicCount, operatorCount, licensesExpiring, trainingExpiring } = useMemo(() => {
    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let pilots = 0;
    let observers = 0;
    let mechanics = 0;
    let operators = 0;
    let licExp = 0;
    let trainExp = 0;

    for (const c of crew) {
      switch (c.role) {
        case CREW_ROLE.PILOT: pilots++; break;
        case CREW_ROLE.OBSERVER: observers++; break;
        case CREW_ROLE.MECHANIC: mechanics++; break;
        case CREW_ROLE.OPERATOR: operators++; break;
      }
      if (c.pilot_license_expiry) {
        const d = new Date(c.pilot_license_expiry);
        if (d <= in30d && d >= now) licExp++;
      }
      if (c.training_expiry) {
        const d = new Date(c.training_expiry);
        if (d <= in30d && d >= now) trainExp++;
      }
    }

    return {
      pilotCount: pilots,
      observerCount: observers,
      mechanicCount: mechanics,
      operatorCount: operators,
      licensesExpiring: licExp,
      trainingExpiring: trainExp,
    };
  }, [crew]);

  const columns: DataTableColumn<CrewMember>[] = [
    {
      key: "email",
      header: t('crew.email'),
      render: (c) => <span className="font-medium">{c.email}</span>,
      sortable: true,
      sortFn: (a, b) => a.email.localeCompare(b.email),
    },
    {
      key: "first_name",
      header: t('crew.firstName'),
      render: (c) => c.first_name,
      sortable: true,
      sortFn: (a, b) => a.first_name.localeCompare(b.first_name),
    },
    {
      key: "last_name",
      header: t('crew.lastName'),
      render: (c) => c.last_name,
      sortable: true,
      sortFn: (a, b) => a.last_name.localeCompare(b.last_name),
    },
    {
      key: "role",
      header: t('crew.role'),
      render: (c) => (
        <Badge variant={CREW_ROLE_BADGE_VARIANT[c.role] ?? "secondary"}>
          {t(CREW_ROLE_DISPLAY_KEY[c.role] ?? c.role)}
        </Badge>
      ),
      sortable: true,
      sortFn: (a, b) => a.role.localeCompare(b.role),
    },
    {
      key: "license_number",
      header: t('crew.licenseNumber'),
      render: (c) => c.pilot_license_number ?? "\u2014",
    },
    {
      key: "license_expiry",
      header: t('crew.pilotLicenseExpiry'),
      render: (c) => c.pilot_license_expiry ?? "\u2014",
      sortable: true,
      sortFn: (a, b) => {
        if (!a.pilot_license_expiry && !b.pilot_license_expiry) return 0;
        if (!a.pilot_license_expiry) return 1;
        if (!b.pilot_license_expiry) return -1;
        return a.pilot_license_expiry.localeCompare(b.pilot_license_expiry);
      },
    },
    {
      key: "training_expiry",
      header: t('crew.trainingDate'),
      render: (c) => c.training_expiry,
      sortable: true,
      sortFn: (a, b) => (a.training_expiry ?? "").localeCompare(b.training_expiry ?? ""),
    },
  ];

  return (
    <>
      {/* Crew Role Summary */}
      {!isLoading && crew.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-surface-container-low rounded-md p-4 border-l-[3px] border-l-[#48A2CE]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('crew.rolePilot')}</p>
              <p className="text-2xl font-bold text-foreground">{pilotCount}</p>
            </div>
            <div className="bg-surface-container-low rounded-md p-4 border-l-[3px] border-l-[#2dd4bf]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('crew.roleObserver')}</p>
              <p className="text-2xl font-bold text-foreground">{observerCount}</p>
            </div>
            <div className="bg-surface-container-low rounded-md p-4 border-l-[3px] border-l-[#a78bfa]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('crew.roleMechanic')}</p>
              <p className="text-2xl font-bold text-foreground">{mechanicCount}</p>
            </div>
            <div className="bg-surface-container-low rounded-md p-4 border-l-[3px] border-l-[#F2C432]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('crew.roleOperator')}</p>
              <p className="text-2xl font-bold text-foreground">{operatorCount}</p>
            </div>
          </div>

          {(licensesExpiring > 0 || trainingExpiring > 0) && (
            <div className="bg-[#F2C432]/10 border border-[#F2C432]/30 rounded-md p-3 mb-4 text-sm">
              {licensesExpiring > 0 && (
                <p className="text-[#F2C432]">
                  {licensesExpiring} {t('crew.licensesExpiring')}
                </p>
              )}
              {trainingExpiring > 0 && (
                <p className="text-[#F2C432]">
                  {trainingExpiring} {t('crew.trainingExpiring')}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <DataTable<CrewMember>
        title={t('crew.title')}
        subtitle={t('crew.subtitle')}
        columns={columns}
        data={sorted}
        isLoading={isLoading}
        error={error}
        loadingMessage={t('crew.loading')}
        errorMessage={t('common.loadingError')}
        emptyMessage={t('crew.noCrewMembers')}
        addButton={isAdmin ? { href: "/crew/new", label: t('crew.addCrewMember') } : undefined}
        rowKey={(c) => c.id}
        actionsHeader={t('common.actions')}
        actions={isAdmin ? (c) => (
          <div className="flex justify-end gap-1">
            <Link to={`/crew/${c.id}/edit`} title={t('common.edit')}>
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(c)}
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
            {t('crew.confirmDeleteMsg')}{" "}
            <strong>
              {deleteTarget?.first_name} {deleteTarget?.last_name}
            </strong>{" "}
            ({deleteTarget?.email})? {t('common.cannotUndo')}
          </>
        }
      />
    </>
  );
}
