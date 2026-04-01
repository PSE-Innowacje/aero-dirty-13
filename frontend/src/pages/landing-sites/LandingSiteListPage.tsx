/**
 * LandingSiteListPage — List landing sites with RBAC-filtered actions.
 * Sorted by name (alphabetical).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Pencil, Trash2 } from "lucide-react";

interface LandingSite {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export function LandingSiteListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.system_role === "Administrator";
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<LandingSite | null>(null);

  const { data: sites = [], isLoading, error } = useQuery<LandingSite[]>({
    queryKey: ["landing-sites"],
    queryFn: () => apiFetch<LandingSite[]>("/landing-sites"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/landing-sites/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-sites"] });
      setDeleteTarget(null);
    },
  });

  // Sort by name
  const sorted = [...sites].sort((a, b) => a.name.localeCompare(b.name));

  const columns: DataTableColumn<LandingSite>[] = [
    {
      key: "name",
      header: t('landingSites.name'),
      render: (s) => <span className="font-medium">{s.name}</span>,
    },
    {
      key: "latitude",
      header: t('landingSites.latitude'),
      render: (s) => s.latitude,
    },
    {
      key: "longitude",
      header: t('landingSites.longitude'),
      render: (s) => s.longitude,
    },
  ];

  return (
    <>
      <DataTable<LandingSite>
        title={t('landingSites.title')}
        subtitle={t('landingSites.subtitle')}
        columns={columns}
        data={sorted}
        isLoading={isLoading}
        error={error}
        loadingMessage={t('landingSites.loading')}
        errorMessage={t('common.loadingError')}
        emptyMessage={t('landingSites.noLandingSites')}
        addButton={isAdmin ? { href: "/landing-sites/new", label: t('landingSites.addLandingSite') } : undefined}
        rowKey={(s) => s.id}
        actionsHeader={t('common.actions')}
        actions={isAdmin ? (s) => (
          <div className="flex justify-end gap-1">
            <Link to={`/landing-sites/${s.id}/edit`} title={t('common.edit')}>
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(s)}
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
            {t('landingSites.confirmDeleteMsg')}{" "}
            <strong>{deleteTarget?.name}</strong>?
            {" "}{t('common.cannotUndo')}
          </>
        }
      />
    </>
  );
}
