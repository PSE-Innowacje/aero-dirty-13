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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('landingSites.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4">
        <p className="text-sm text-destructive-foreground">
          {t('common.loadingError')}: {error instanceof Error ? error.message : t('common.unknownError')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('landingSites.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('landingSites.subtitle')}
          </p>
        </div>
        {isAdmin && (
          <Link to="/landing-sites/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('landingSites.addLandingSite')}
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-md bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('landingSites.name')}</TableHead>
              <TableHead>{t('landingSites.latitude')}</TableHead>
              <TableHead>{t('landingSites.longitude')}</TableHead>
              {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                  {t('landingSites.noLandingSites')}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.latitude}</TableCell>
                  <TableCell>{s.longitude}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
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
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
}
