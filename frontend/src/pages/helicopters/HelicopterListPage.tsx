/**
 * HelicopterListPage — List helicopters with RBAC-filtered actions.
 * Sorted by status (aktywny first) then registration_number.
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

export function HelicopterListPage() {
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
        <p className="text-muted-foreground">Ładowanie helikopterów…</p>
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
          <h1 className="text-2xl font-bold text-foreground">Helikoptery</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzanie flotą helikopterów
          </p>
        </div>
        {isAdmin && (
          <Link to="/helicopters/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj helikopter
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numer rejestracyjny</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data przeglądu</TableHead>
              <TableHead>Zasięg (km)</TableHead>
              {isAdmin && <TableHead className="text-right">Akcje</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                  Brak helikopterów
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.registration_number}</TableCell>
                  <TableCell>{h.helicopter_type}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[h.status] ?? "secondary"}>
                      {h.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{h.inspection_date ?? "—"}</TableCell>
                  <TableCell>{h.range_km}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/helicopters/${h.id}/edit`} title="Edytuj">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(h)}
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
              Czy na pewno chcesz usunąć helikopter{" "}
              <strong>{deleteTarget?.registration_number}</strong> ({deleteTarget?.helicopter_type})?
              Tej operacji nie można cofnąć.
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
