/**
 * OperationListPage — list flight operations with status filter and RBAC actions.
 * Sorted by id DESC (newest first). Status badges with color mapping.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

interface OperationListItem {
  id: number;
  order_number: string | null;
  short_description: string | null;
  activity_types: string[] | null;
  proposed_date_earliest: string | null;
  proposed_date_latest: string | null;
  planned_date_earliest: string | null;
  planned_date_latest: string | null;
  status: number;
  route_km: number | null;
}

const STATUS_LABELS: Record<number, string> = {
  1: "Wprowadzona",
  2: "Odrzucona",
  3: "Potwierdzona",
  4: "Zaplanowana",
  5: "Częściowo zrealizowana",
  6: "Zrealizowana",
  7: "Rezygnacja",
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_BADGE_VARIANT: Record<number, BadgeVariant> = {
  1: "default",
  2: "destructive",
  3: "default",
  4: "outline",
  5: "outline",
  6: "default",
  7: "secondary",
};

const STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-blue-500 text-white border-transparent",
  2: "",  // destructive variant handles red
  3: "bg-green-600 text-white border-transparent",
  4: "bg-amber-500 text-white border-transparent",
  5: "bg-orange-500 text-white border-transparent",
  6: "bg-green-600 text-white border-transparent",
  7: "",  // secondary variant handles grey
};

function formatDateRange(earliest: string | null, latest: string | null): string {
  if (!earliest && !latest) return "—";
  if (earliest && latest) return `${earliest} — ${latest}`;
  return earliest ?? latest ?? "—";
}

export function OperationListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const canCreate =
    user?.system_role === "Osoba planująca" ||
    user?.system_role === "Osoba nadzorująca";

  const queryParams = statusFilter ? `?op_status=${statusFilter}` : "";

  const {
    data: operations = [],
    isLoading,
    error,
  } = useQuery<OperationListItem[]>({
    queryKey: ["operations", statusFilter],
    queryFn: () =>
      apiFetch<OperationListItem[]>(`/operations${queryParams}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Ładowanie operacji…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          Błąd ładowania:{" "}
          {error instanceof Error ? error.message : "Nieznany błąd"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Operacje lotnicze
          </h1>
          <p className="text-sm text-muted-foreground">
            Zarządzanie operacjami lotniczymi
          </p>
        </div>
        {canCreate && (
          <Link to="/operations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj operację
            </Button>
          </Link>
        )}
      </div>

      {/* Status filter */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">
          Filtruj po statusie:
        </label>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-56"
        >
          <option value="">Wszystkie</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Nr</TableHead>
              <TableHead>Nr zlecenia</TableHead>
              <TableHead>Rodzaj czynności</TableHead>
              <TableHead>Proponowane daty</TableHead>
              <TableHead>Planowane daty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Trasa km</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  Brak operacji
                </TableCell>
              </TableRow>
            ) : (
              operations.map((op) => (
                <TableRow
                  key={op.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/operations/${op.id}`)}
                >
                  <TableCell className="font-medium">{op.id}</TableCell>
                  <TableCell>{op.order_number ?? "—"}</TableCell>
                  <TableCell>
                    {op.activity_types?.join(", ") ?? "—"}
                  </TableCell>
                  <TableCell>
                    {formatDateRange(
                      op.proposed_date_earliest,
                      op.proposed_date_latest
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDateRange(
                      op.planned_date_earliest,
                      op.planned_date_latest
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_BADGE_VARIANT[op.status] ?? "secondary"}
                      className={STATUS_BADGE_CLASS[op.status] ?? ""}
                    >
                      {STATUS_LABELS[op.status] ?? `Status ${op.status}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {op.route_km != null ? `${op.route_km}` : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
