/**
 * CrewListPage — List crew members with RBAC-filtered actions.
 * Sorted by email (alphabetical).
 */
import { useState } from "react";
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
import { CREW_ROLE_BADGE_VARIANT, CREW_ROLE_DISPLAY_KEY, SYSTEM_ROLE } from "@/lib/constants";

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

  const columns: DataTableColumn<CrewMember>[] = [
    {
      key: "email",
      header: t('crew.email'),
      render: (c) => <span className="font-medium">{c.email}</span>,
    },
    {
      key: "first_name",
      header: t('crew.firstName'),
      render: (c) => c.first_name,
    },
    {
      key: "last_name",
      header: t('crew.lastName'),
      render: (c) => c.last_name,
    },
    {
      key: "role",
      header: t('crew.role'),
      render: (c) => (
        <Badge variant={CREW_ROLE_BADGE_VARIANT[c.role] ?? "secondary"}>
          {t(CREW_ROLE_DISPLAY_KEY[c.role] ?? c.role)}
        </Badge>
      ),
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
    },
    {
      key: "training_expiry",
      header: t('crew.trainingDate'),
      render: (c) => c.training_expiry,
    },
  ];

  return (
    <>
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
