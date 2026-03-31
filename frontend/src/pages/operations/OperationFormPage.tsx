/**
 * OperationFormPage — dual create/detail-edit page for flight operations.
 *
 * Create mode:  /operations/new  — form with editable fields, redirect after create.
 * Detail mode:  /operations/:id  — shows all fields, role-dependent editing,
 *   KML upload, map, status buttons, audit trail, comments.
 */
import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch, ApiError, getStoredToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { OperationMap } from "@/components/maps/OperationMap";
import { ArrowLeft, Upload, CheckCircle, XCircle, LogOut } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by_email: string;
}

interface CommentEntry {
  id: number;
  content: string;
  created_at: string;
  author_email: string;
  author_name: string;
}

interface OperationDetail {
  id: number;
  order_number: string | null;
  short_description: string | null;
  route_coordinates: [number, number][] | null;
  route_km: number | null;
  proposed_date_earliest: string | null;
  proposed_date_latest: string | null;
  planned_date_earliest: string | null;
  planned_date_latest: string | null;
  activity_types: string[] | null;
  additional_info: string | null;
  status: number;
  contact_emails: string[] | null;
  post_realization_notes: string | null;
  created_at: string | null;
  created_by_email: string;
  audit_logs: AuditLogEntry[];
  comments: CommentEntry[];
}

// ── Constants ──────────────────────────────────────────────────────

const ACTIVITY_TYPE_OPTIONS = [
  { value: "oględziny wizualne", labelKey: "operations.activityTypeVisualInspection" },
  { value: "skan 3D", labelKey: "operations.activityType3dScan" },
  { value: "lokalizacja awarii", labelKey: "operations.activityTypeFaultLocation" },
  { value: "zdjęcia", labelKey: "operations.activityTypePhotos" },
  { value: "patrolowanie", labelKey: "operations.activityTypePatrolling" },
];

// Status labels now use t('operations.statusN') via i18n

const STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-blue-500 text-white",
  2: "bg-red-500 text-white",
  3: "bg-green-600 text-white",
  4: "bg-amber-500 text-black",
  5: "bg-orange-500 text-black",
  6: "bg-green-600 text-white",
  7: "bg-gray-400 text-black",
};

// ── Main Component ─────────────────────────────────────────────────

export function OperationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  const role = user?.system_role ?? "";
  const isPlanner = role === "Osoba planująca";
  const isSupervisor = role === "Osoba nadzorująca";

  // ── Form state ─────────────────────────────────────────────────
  const [orderNumber, setOrderNumber] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [contactEmails, setContactEmails] = useState("");
  const [proposedDateEarliest, setProposedDateEarliest] = useState("");
  const [proposedDateLatest, setProposedDateLatest] = useState("");
  const [plannedDateEarliest, setPlannedDateEarliest] = useState("");
  const [plannedDateLatest, setPlannedDateLatest] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── KML upload state ───────────────────────────────────────────
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [kmlUploading, setKmlUploading] = useState(false);
  const [kmlError, setKmlError] = useState<string | null>(null);

  // ── Confirm dialog state ───────────────────────────────────────
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmPlannedEarliest, setConfirmPlannedEarliest] = useState("");
  const [confirmPlannedLatest, setConfirmPlannedLatest] = useState("");

  // ── Comment state ──────────────────────────────────────────────
  const [commentText, setCommentText] = useState("");

  // ── Fetch operation for detail mode ────────────────────────────
  const {
    data: operation,
    isLoading: loadingOp,
  } = useQuery<OperationDetail>({
    queryKey: ["operation", id],
    queryFn: () => apiFetch<OperationDetail>(`/operations/${id}`),
    enabled: !isCreate,
  });

  // Populate form from fetched data
  useEffect(() => {
    if (operation) {
      setOrderNumber(operation.order_number ?? "");
      setShortDescription(operation.short_description ?? "");
      setActivityTypes(operation.activity_types ?? []);
      setAdditionalInfo(operation.additional_info ?? "");
      setContactEmails(operation.contact_emails?.join(", ") ?? "");
      setProposedDateEarliest(operation.proposed_date_earliest ?? "");
      setProposedDateLatest(operation.proposed_date_latest ?? "");
      setPlannedDateEarliest(operation.planned_date_earliest ?? "");
      setPlannedDateLatest(operation.planned_date_latest ?? "");
    }
  }, [operation]);

  // ── Save (create or update) ────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const emailList = contactEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        order_number: orderNumber || null,
        short_description: shortDescription || null,
        activity_types: activityTypes.length > 0 ? activityTypes : null,
        additional_info: additionalInfo || null,
        contact_emails: emailList.length > 0 ? emailList : null,
        proposed_date_earliest: proposedDateEarliest || null,
        proposed_date_latest: proposedDateLatest || null,
      };

      // Supervisor can edit planned dates
      if (isSupervisor && !isCreate) {
        body.planned_date_earliest = plannedDateEarliest || null;
        body.planned_date_latest = plannedDateLatest || null;
      }

      if (isCreate) {
        return apiFetch<OperationDetail>("/operations", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      return apiFetch<OperationDetail>(`/operations/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      if (isCreate) {
        navigate(`/operations/${data.id}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ["operation", id] });
      }
      setError(null);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message);
      }
    },
  });

  // ── KML upload ─────────────────────────────────────────────────
  async function handleKmlUpload() {
    if (!kmlFile || !id) return;
    setKmlUploading(true);
    setKmlError(null);

    const formData = new FormData();
    formData.append("file", kmlFile);

    try {
      const token = getStoredToken();
      const res = await fetch(`/api/operations/${id}/kml`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          detail = body.detail ?? JSON.stringify(body);
        } catch {
          // keep default
        }
        setKmlError(detail);
      } else {
        queryClient.invalidateQueries({ queryKey: ["operation", id] });
        setKmlFile(null);
      }
    } catch (err) {
      setKmlError(err instanceof Error ? err.message : t('operations.uploadError'));
    } finally {
      setKmlUploading(false);
    }
  }

  // ── Status transitions ─────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: () =>
      apiFetch<OperationDetail>(`/operations/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          planned_date_earliest: confirmPlannedEarliest,
          planned_date_latest: confirmPlannedLatest,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation", id] });
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      setShowConfirmDialog(false);
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.detail : err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      apiFetch<OperationDetail>(`/operations/${id}/reject`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation", id] });
      queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.detail : err.message);
    },
  });

  const resignMutation = useMutation({
    mutationFn: () =>
      apiFetch<OperationDetail>(`/operations/${id}/resign`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation", id] });
      queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.detail : err.message);
    },
  });

  // ── Add comment ────────────────────────────────────────────────
  const commentMutation = useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/operations/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentText }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation", id] });
      setCommentText("");
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.detail : err.message);
    },
  });

  // ── Form submit ────────────────────────────────────────────────
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    saveMutation.mutate();
  }

  function handleActivityToggle(value: string) {
    setActivityTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (!isCreate && loadingOp) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('operations.loading')}</p>
      </div>
    );
  }

  const currentStatus = operation?.status ?? 1;

  // PRD 6.5.d — Planner can edit in statuses 1-5 only; Supervisor in all statuses
  const PLANNER_EDITABLE_STATUSES = [1, 2, 3, 4, 5];
  const canEdit = isSupervisor || (isPlanner && PLANNER_EDITABLE_STATUSES.includes(currentStatus));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/operations")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('operations.backToList')}
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {isCreate
              ? t('operations.newOperation')
              : t('operations.operationNumber', { id: operation?.id })}
          </h1>
          {!isCreate && (
            <Badge className={STATUS_BADGE_CLASS[currentStatus] ?? ""}>
              {t(`operations.status${currentStatus}`, { defaultValue: `Status ${currentStatus}` })}
            </Badge>
          )}
        </div>
        {!isCreate && operation && (
          <p className="text-sm text-muted-foreground mt-1">
            {t('operations.createdBy', { email: operation.created_by_email })}
            {operation.created_at &&
              ` • ${new Date(operation.created_at).toLocaleString("pl-PL")}`}
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 mb-4">
          <p className="text-sm text-destructive-foreground">{error}</p>
        </div>
      )}

      {/* Status action buttons */}
      {!isCreate && (
        <StatusActions
          status={currentStatus}
          isSupervisor={isSupervisor}
          isPlanner={isPlanner}
          onConfirm={() => setShowConfirmDialog(true)}
          onReject={() => rejectMutation.mutate()}
          onResign={() => resignMutation.mutate()}
          rejectPending={rejectMutation.isPending}
          resignPending={resignMutation.isPending}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form fields */}
        <div className="rounded-md bg-surface-container-low p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">{t('operations.orderNumber')}</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                maxLength={30}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">{t('operations.shortDescription')}</Label>
              <Input
                id="shortDescription"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={100}
                disabled={!canEdit}
              />
            </div>

            {/* Activity types checkboxes */}
            <div className="space-y-2">
              <Label>{t('operations.activityTypesLabel')}</Label>
              <div className="flex flex-wrap gap-3">
                {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={activityTypes.includes(opt.value)}
                      onChange={() => handleActivityToggle(opt.value)}
                      disabled={!canEdit}
                      className="rounded border-input"
                    />
                    {t(opt.labelKey)}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">{t('operations.additionalInfo')}</Label>
              <Textarea
                id="additionalInfo"
                value={additionalInfo}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setAdditionalInfo(e.target.value)
                }
                maxLength={500}
                rows={3}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmails">
                {t('operations.contactEmails')}
              </Label>
              <Input
                id="contactEmails"
                value={contactEmails}
                onChange={(e) => setContactEmails(e.target.value)}
                placeholder="jan@example.com, anna@example.com"
                disabled={!canEdit}
              />
            </div>

            {/* Proposed dates — editable by Planner and Supervisor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposedDateEarliest">
                  {t('operations.proposedDateFrom')}
                </Label>
                <Input
                  id="proposedDateEarliest"
                  type="date"
                  value={proposedDateEarliest}
                  onChange={(e) => setProposedDateEarliest(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedDateLatest">{t('operations.proposedDateTo')}</Label>
                <Input
                  id="proposedDateLatest"
                  type="date"
                  value={proposedDateLatest}
                  onChange={(e) => setProposedDateLatest(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Planned dates — editable ONLY by Supervisor in detail mode */}
            {!isCreate && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plannedDateEarliest">
                    {t('operations.plannedDateFrom')}
                  </Label>
                  <Input
                    id="plannedDateEarliest"
                    type="date"
                    value={plannedDateEarliest}
                    onChange={(e) => setPlannedDateEarliest(e.target.value)}
                    disabled={!isSupervisor}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plannedDateLatest">{t('operations.plannedDateTo')}</Label>
                  <Input
                    id="plannedDateLatest"
                    type="date"
                    value={plannedDateLatest}
                    onChange={(e) => setPlannedDateLatest(e.target.value)}
                    disabled={!isSupervisor}
                  />
                </div>
              </div>
            )}

            {canEdit && (
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? t('operations.saving')
                    : isCreate
                      ? t('operations.createOperation')
                      : t('operations.saveChanges')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/operations")}
                >
                  {t('operations.cancel')}
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Right: KML upload + Map (detail mode only) */}
        {!isCreate && (
          <div className="space-y-6">
            {/* KML Upload */}
            {canEdit && (
              <div className="rounded-md bg-surface-container-low p-6">
                <h2 className="text-lg font-semibold mb-3">{t('operations.kmlFile')}</h2>
                {operation?.route_km != null && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('operations.currentRouteText')} <strong>{operation.route_km} km</strong>
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept=".kml"
                    onChange={(e) =>
                      setKmlFile(e.target.files?.[0] ?? null)
                    }
                    className="flex-1"
                  />
                  <Button
                    onClick={handleKmlUpload}
                    disabled={!kmlFile || kmlUploading}
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {kmlUploading ? t('operations.uploading') : t('operations.uploadKml')}
                  </Button>
                </div>
                {kmlError && (
                  <p className="text-xs text-destructive mt-2">{kmlError}</p>
                )}
              </div>
            )}

            {/* Map */}
            {operation?.route_coordinates &&
              operation.route_coordinates.length > 0 && (
                <div className="rounded-md bg-surface-container-low p-6">
                  <h2 className="text-lg font-semibold mb-3">
                    {t('operations.routeMap')}
                    {operation.route_km != null &&
                      ` (${operation.route_km} km)`}
                  </h2>
                  <OperationMap
                    coordinates={
                      operation.route_coordinates as [number, number][]
                    }
                  />
                </div>
              )}
          </div>
        )}
      </div>

      {/* Audit Trail (detail mode only) */}
      {!isCreate && operation && operation.audit_logs.length > 0 && (
        <div className="mt-6 rounded-md bg-surface-container-low p-6">
          <h2 className="text-lg font-semibold mb-3">{t('operations.auditTrail')}</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operations.auditField')}</TableHead>
                  <TableHead>{t('operations.auditOldValue')}</TableHead>
                  <TableHead>{t('operations.auditNewValue')}</TableHead>
                  <TableHead>{t('operations.auditDate')}</TableHead>
                  <TableHead>{t('operations.auditPerson')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operation.audit_logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.field_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.old_value ?? "—"}
                    </TableCell>
                    <TableCell>{log.new_value ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(log.changed_at).toLocaleString("pl-PL")}
                    </TableCell>
                    <TableCell>{log.changed_by_email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Comments (detail mode only) */}
      {!isCreate && operation && (
        <div className="mt-6 rounded-md bg-surface-container-low p-6">
          <h2 className="text-lg font-semibold mb-3">{t('operations.comments')}</h2>

          {operation.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">
              {t('operations.noComments')}
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {operation.comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border p-3 bg-muted/30"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">{c.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <p className="text-sm mt-1">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <div className="flex gap-3">
            <Textarea
              value={commentText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setCommentText(e.target.value)
              }
              placeholder={t('operations.addCommentPlaceholder')}
              maxLength={500}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => commentMutation.mutate()}
              disabled={!commentText.trim() || commentMutation.isPending}
              className="self-end"
            >
              {commentMutation.isPending ? t('operations.adding') : t('operations.addComment')}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog
        open={showConfirmDialog}
        onOpenChange={() => setShowConfirmDialog(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('operations.confirmOperation')}</DialogTitle>
            <DialogDescription>
              {t('operations.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="confirmEarliest">{t('operations.plannedDateFrom')}</Label>
              <Input
                id="confirmEarliest"
                type="date"
                value={confirmPlannedEarliest}
                onChange={(e) => setConfirmPlannedEarliest(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmLatest">{t('operations.plannedDateTo')}</Label>
              <Input
                id="confirmLatest"
                type="date"
                value={confirmPlannedLatest}
                onChange={(e) => setConfirmPlannedLatest(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              {t('operations.cancel')}
            </Button>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={
                !confirmPlannedEarliest ||
                !confirmPlannedLatest ||
                confirmMutation.isPending
              }
            >
              {confirmMutation.isPending ? t('operations.confirming') : t('operations.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── StatusActions sub-component ─────────────────────────────────────

function StatusActions({
  status,
  isSupervisor,
  isPlanner,
  onConfirm,
  onReject,
  onResign,
  rejectPending,
  resignPending,
}: {
  status: number;
  isSupervisor: boolean;
  isPlanner: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onResign: () => void;
  rejectPending: boolean;
  resignPending: boolean;
}) {
  const { t } = useTranslation();
  const showSupervisorActions = isSupervisor && status === 1;
  const showResign = isPlanner && [1, 3, 4].includes(status);

  if (!showSupervisorActions && !showResign) return null;

  return (
    <div className="mb-6 flex gap-3">
      {showSupervisorActions && (
        <>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('operations.confirm')}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={rejectPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {rejectPending ? t('operations.rejecting') : t('operations.reject')}
          </Button>
        </>
      )}
      {showResign && (
        <Button
          variant="outline"
          onClick={onResign}
          disabled={resignPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {resignPending ? t('operations.resigning') : t('operations.resign')}
        </Button>
      )}
    </div>
  );
}
