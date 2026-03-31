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

const roleBadgeVariant: Record<string, "default" | "secondary"> = {
  Pilot: "default",
  Obserwator: "secondary",
  Mechanik: "secondary",
  Operator: "secondary",
};

const roleDisplayKey: Record<string, string> = {
  Pilot: "crew.rolePilot",
  Obserwator: "crew.roleObserver",
  Mechanik: "crew.roleMechanic",
  Operator: "crew.roleOperator",
};

export function CrewListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.system_role === "Administrator";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('crew.loading')}</p>
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
          <h1 className="text-2xl font-bold text-foreground">{t('crew.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('crew.subtitle')}
          </p>
        </div>
        {isAdmin && (
          <Link to="/crew/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('crew.addCrewMember')}
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-md bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('crew.email')}</TableHead>
              <TableHead>{t('crew.firstName')}</TableHead>
              <TableHead>{t('crew.lastName')}</TableHead>
              <TableHead>{t('crew.role')}</TableHead>
              <TableHead>{t('crew.licenseNumber')}</TableHead>
              <TableHead>{t('crew.pilotLicenseExpiry')}</TableHead>
              <TableHead>{t('crew.trainingDate')}</TableHead>
              {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">
                  {t('crew.noCrewMembers')}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.email}</TableCell>
                  <TableCell>{c.first_name}</TableCell>
                  <TableCell>{c.last_name}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[c.role] ?? "secondary"}>
                      {t(roleDisplayKey[c.role] ?? c.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.pilot_license_number ?? "—"}</TableCell>
                  <TableCell>{c.pilot_license_expiry ?? "—"}</TableCell>
                  <TableCell>{c.training_expiry}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
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
              {t('crew.confirmDeleteMsg')}{" "}
              <strong>
                {deleteTarget?.first_name} {deleteTarget?.last_name}
              </strong>{" "}
              ({deleteTarget?.email})? {t('common.cannotUndo')}
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
