/**
 * CrewListPage — List crew members with RBAC-filtered actions.
 * Sorted by email (alphabetical).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
};

export function CrewListPage() {
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
      apiFetch<void>(`/crew/${id}`, { method: "DELETE" }),
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
        <p className="text-muted-foreground">Ładowanie członków załogi…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          Błąd ładowania: {error instanceof Error ? error.message : "Nieznany błąd"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Członkowie załogi</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzanie pilotami i obserwatorami
          </p>
        </div>
        {isAdmin && (
          <Link to="/crew/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj członka załogi
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Imię</TableHead>
              <TableHead>Nazwisko</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead>Nr licencji</TableHead>
              <TableHead>Data szkolenia</TableHead>
              {isAdmin && <TableHead className="text-right">Akcje</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                  Brak członków załogi
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
                      {c.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.pilot_license_number ?? "—"}</TableCell>
                  <TableCell>{c.training_expiry}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/crew/${c.id}/edit`} title="Edytuj">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(c)}
                          title="Usuń"
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
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć członka załogi{" "}
              <strong>
                {deleteTarget?.first_name} {deleteTarget?.last_name}
              </strong>{" "}
              ({deleteTarget?.email})? Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Usuwanie…" : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
