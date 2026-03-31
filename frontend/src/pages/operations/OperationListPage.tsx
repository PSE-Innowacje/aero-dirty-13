/**
 * OperationListPage — list flight operations with status filter and RBAC actions.
 * Sorted by id DESC (newest first). Status badges with color mapping.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

const STATUS_KEYS = [1, 2, 3, 4, 5, 6, 7];

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
  1: "bg-blue-500 text-white",
  2: "",  // destructive variant handles red
  3: "bg-green-600 text-white",
  4: "bg-amber-500 text-white",
  5: "bg-orange-500 text-white",
  6: "bg-green-600 text-white",
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
  const { t } = useTranslation();
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
        <p className="text-muted-foreground">{t('operations.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4">
        <p className="text-sm text-destructive-foreground">
          {t('operations.loadingError')}:{" "}
          {error instanceof Error ? error.message : t('operations.unknownError')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('operations.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('operations.subtitle')}
          </p>
        </div>
        {canCreate && (
          <Link to="/operations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('operations.addOperation')}
            </Button>
          </Link>
        )}
      </div>

      {/* Status filter */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">
          {t('operations.filterByStatus')}
        </label>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-56"
        >
          <option value="">{t('operations.allStatuses')}</option>
          {STATUS_KEYS.map((val) => (
            <option key={val} value={val}>
              {t(`operations.status${val}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-md bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t('operations.id')}</TableHead>
              <TableHead>{t('operations.orderNumber')}</TableHead>
              <TableHead>{t('operations.activityTypes')}</TableHead>
              <TableHead>{t('operations.proposedDates')}</TableHead>
              <TableHead>{t('operations.plannedDates')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('operations.routeKm')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  {t('operations.noOperations')}
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
                      {t(`operations.status${op.status}`, { defaultValue: `Status ${op.status}` })}
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
