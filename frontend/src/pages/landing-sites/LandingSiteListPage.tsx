/**
 * LandingSiteListPage — List landing sites with RBAC-filtered actions.
 * Sorted by name (alphabetical).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface LandingSite {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export function LandingSiteListPage() {
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
        <p className="text-muted-foreground">Ładowanie lądowisk…</p>
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
          <h1 className="text-2xl font-bold text-foreground">Lądowiska</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzanie miejscami lądowania
          </p>
        </div>
        {isAdmin && (
          <Link to="/landing-sites/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj lądowisko
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Szerokość</TableHead>
              <TableHead>Długość</TableHead>
              {isAdmin && <TableHead className="text-right">Akcje</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                  Brak lądowisk
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
                        <Link to={`/landing-sites/${s.id}/edit`} title="Edytuj">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(s)}
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
              Czy na pewno chcesz usunąć lądowisko{" "}
              <strong>{deleteTarget?.name}</strong>?
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
