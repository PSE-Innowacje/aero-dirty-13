/**
 * UserListPage — Admin user list with table, add/edit/delete actions.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/auth";
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
import { SYSTEM_ROLE_BADGE_VARIANT, SYSTEM_ROLE_DISPLAY_KEY } from "@/lib/constants";

export function UserListPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    },
  });

  // Sort by email (alphabetical)
  const sorted = [...users].sort((a, b) => a.email.localeCompare(b.email));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('users.loading')}</p>
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
          <h1 className="text-2xl font-bold text-foreground">{t('users.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('users.subtitle')}
          </p>
        </div>
        <Link to="/users/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('users.addUser')}
          </Button>
        </Link>
      </div>

      <div className="rounded-md bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('users.email')}</TableHead>
              <TableHead>{t('users.firstName')}</TableHead>
              <TableHead>{t('users.lastName')}</TableHead>
              <TableHead>{t('users.role')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {t('users.noUsers')}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.first_name}</TableCell>
                  <TableCell>{u.last_name}</TableCell>
                  <TableCell>
                    <Badge variant={SYSTEM_ROLE_BADGE_VARIANT[u.system_role] ?? "secondary"}>
                      {t(SYSTEM_ROLE_DISPLAY_KEY[u.system_role] ?? u.system_role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/users/${u.id}/edit`} title={t('common.edit')}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(u)}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
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
              {t('users.confirmDeleteMsg')}{" "}
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
