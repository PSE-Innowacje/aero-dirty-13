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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Pencil, Trash2 } from "lucide-react";
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

  const columns: DataTableColumn<User>[] = [
    {
      key: "email",
      header: t('users.email'),
      render: (u) => <span className="font-medium">{u.email}</span>,
    },
    {
      key: "first_name",
      header: t('users.firstName'),
      render: (u) => u.first_name,
    },
    {
      key: "last_name",
      header: t('users.lastName'),
      render: (u) => u.last_name,
    },
    {
      key: "role",
      header: t('users.role'),
      render: (u) => (
        <Badge variant={SYSTEM_ROLE_BADGE_VARIANT[u.system_role] ?? "secondary"}>
          {t(SYSTEM_ROLE_DISPLAY_KEY[u.system_role] ?? u.system_role)}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <DataTable<User>
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        columns={columns}
        data={sorted}
        isLoading={isLoading}
        error={error}
        loadingMessage={t('users.loading')}
        errorMessage={t('common.loadingError')}
        emptyMessage={t('users.noUsers')}
        addButton={{ href: "/users/new", label: t('users.addUser') }}
        rowKey={(u) => u.id}
        actionsHeader={t('common.actions')}
        actions={(u) => (
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
        )}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
        description={
          <>
            {t('users.confirmDeleteMsg')}{" "}
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
