/**
 * OperationListPage — list flight operations with status filter, RBAC actions,
 * and inline status change buttons per PRD 6.5 c/d/f/g.
 * Sorted by id DESC (newest first). Status badges with color mapping.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Plus, CheckCircle, XCircle, Ban } from "lucide-react";
import {
  OPERATION_STATUS,
  OPERATION_STATUS_KEYS,
  OPERATION_STATUS_BADGE_VARIANT,
  OPERATION_STATUS_BADGE_CLASS,
  SYSTEM_ROLE,
} from "@/lib/constants";

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

function formatDateRange(earliest: string | null, latest: string | null): string {
  if (!earliest && !latest) return "—";
  if (earliest && latest) return `${earliest} — ${latest}`;
  return earliest ?? latest ?? "—";
}

export function OperationListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("3");
  const [mutationError, setMutationError] = useState<string | null>(null);

  const role = user?.system_role ?? "";
  const isPlanner = role === SYSTEM_ROLE.PLANNER;
  const isSupervisor = role === SYSTEM_ROLE.SUPERVISOR;
  const canCreate = isPlanner || isSupervisor;

  // ── Confirm dialog state ─────────────────────────────────────
  const [confirmOpId, setConfirmOpId] = useState<number | null>(null);
  const [confirmPlannedEarliest, setConfirmPlannedEarliest] = useState("");
  const [confirmPlannedLatest, setConfirmPlannedLatest] = useState("");
  const confirmDateError = !!(confirmPlannedEarliest && confirmPlannedLatest && confirmPlannedLatest < confirmPlannedEarliest);

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

  // ── Status transition mutations ──────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/operations/${confirmOpId}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          planned_date_earliest: confirmPlannedEarliest,
          planned_date_latest: confirmPlannedLatest,
        }),
      }),
    onSuccess: () => {
      setConfirmOpId(null);
      setConfirmPlannedEarliest("");
      setConfirmPlannedLatest("");
      queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (opId: number) =>
      apiFetch(`/operations/${opId}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      setMutationError(null);
    },
    onError: (err: Error) => {
      setMutationError(err.message);
    },
  });

  const resignMutation = useMutation({
    mutationFn: (opId: number) =>
      apiFetch(`/operations/${opId}/resign`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      setMutationError(null);
    },
    onError: (err: Error) => {
      setMutationError(err.message);
    },
  });

  /** Check if any action buttons should appear for this row */
  function hasActions(opStatus: number): boolean {
    if (isSupervisor && opStatus === OPERATION_STATUS.INTRODUCED) return true;
    if (isPlanner && ([OPERATION_STATUS.INTRODUCED, OPERATION_STATUS.CONFIRMED, OPERATION_STATUS.ORDERED] as number[]).includes(opStatus)) return true;
    return false;
  }

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

  /** Whether any row in the list has actions — controls column visibility */
  const showActionsColumn = operations.some((op) => hasActions(op.status));

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

      {/* Mutation error banner */}
      {mutationError && (
        <div className="rounded-md bg-destructive/10 p-3 mb-4">
          <p className="text-sm text-destructive-foreground">{mutationError}</p>
        </div>
      )}

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
          {OPERATION_STATUS_KEYS.map((val) => (
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
              {showActionsColumn && (
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActionsColumn ? 8 : 7}
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
                      variant={OPERATION_STATUS_BADGE_VARIANT[op.status] ?? "secondary"}
                      className={OPERATION_STATUS_BADGE_CLASS[op.status] ?? ""}
                    >
                      {t(`operations.status${op.status}`, { defaultValue: `Status ${op.status}` })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {op.route_km != null ? `${op.route_km}` : "—"}
                  </TableCell>
                  {showActionsColumn && (
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* PRD 6.5.f — Supervisor: Confirm (1→3) */}
                        {isSupervisor && op.status === OPERATION_STATUS.INTRODUCED && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setConfirmOpId(op.id);
                              setConfirmPlannedEarliest("");
                              setConfirmPlannedLatest("");
                            }}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {t('operations.confirm')}
                          </Button>
                        )}
                        {/* PRD 6.5.f — Supervisor: Reject (1→2) */}
                        {isSupervisor && op.status === OPERATION_STATUS.INTRODUCED && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(op.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            {t('operations.reject')}
                          </Button>
                        )}
                        {/* PRD 6.5.g — Planner: Resign (1,3,4→7) */}
                        {isPlanner && ([OPERATION_STATUS.INTRODUCED, OPERATION_STATUS.CONFIRMED, OPERATION_STATUS.ORDERED] as number[]).includes(op.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resignMutation.mutate(op.id)}
                            disabled={resignMutation.isPending}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            {t('operations.resign')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm dialog — requires planned dates (PRD 6.5.f) */}
      <Dialog
        open={confirmOpId !== null}
        onOpenChange={() => setConfirmOpId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('operations.confirmOperation')} #{confirmOpId}
            </DialogTitle>
            <DialogDescription>
              {t('operations.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('operations.plannedDateFrom')}</Label>
              <Input
                type="date"
                value={confirmPlannedEarliest}
                onChange={(e) => setConfirmPlannedEarliest(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('operations.plannedDateTo')}</Label>
              <Input
                type="date"
                value={confirmPlannedLatest}
                onChange={(e) => setConfirmPlannedLatest(e.target.value)}
              />
            </div>
          </div>
          {confirmDateError && (
            <p className="text-sm text-destructive-foreground">{t('operations.validationPlannedDateOrder')}</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmMutation.mutate()}
              disabled={
                confirmMutation.isPending ||
                !confirmPlannedEarliest ||
                !confirmPlannedLatest ||
                confirmDateError
              }
            >
              {confirmMutation.isPending
                ? t('operations.confirming')
                : t('operations.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
