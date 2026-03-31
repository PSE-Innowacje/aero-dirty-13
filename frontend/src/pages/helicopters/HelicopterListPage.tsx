/**
 * HelicopterListPage — List helicopters with RBAC-filtered actions.
 * Sorted by status (aktywny first) then registration_number.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

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

const statusBadgeVariant: Record<string, "default" | "secondary"> = {
  aktywny: "default",
  nieaktywny: "secondary",
};

const statusDisplayKey: Record<string, string> = {
  aktywny: "helicopters.statusActive",
  nieaktywny: "helicopters.statusInactive",
};

export function HelicopterListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.system_role === "Administrator";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('helicopters.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          {t('common.loadingError')}: {error instanceof Error ? error.message : t('common.unknownError')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('helicopters.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('helicopters.subtitle')}
          </p>
        </div>
        {isAdmin && (
          <Link to="/helicopters/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('helicopters.addHelicopter')}
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('helicopters.registrationNumber')}</TableHead>
              <TableHead>{t('helicopters.type')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('helicopters.inspectionDate')}</TableHead>
              <TableHead>{t('helicopters.rangeKm')}</TableHead>
              {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                  {t('helicopters.noHelicopters')}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.registration_number}</TableCell>
                  <TableCell>{h.helicopter_type}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[h.status] ?? "secondary"}>
                      {t(statusDisplayKey[h.status] ?? h.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{h.inspection_date ?? "—"}</TableCell>
                  <TableCell>{h.range_km}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
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
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('helicopters.confirmDeleteMsg')}{" "}
              <strong>{deleteTarget?.registration_number}</strong> ({deleteTarget?.helicopter_type})?
              {" "}{t('common.cannotUndo')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
