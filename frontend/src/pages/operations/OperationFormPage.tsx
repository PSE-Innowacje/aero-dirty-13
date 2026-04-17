/**
 * OperationFormPage — dual create/detail-edit orchestrator for flight operations.
 *
 * Create mode:  /operations/new  — renders <OperationCreateForm />
 * Detail mode:  /operations/:id  — renders <OperationStatusActions /> + <OperationDetailView />
 *
 * All state, queries, mutations, and dialogs live here. Child components
 * receive data and handlers via props.
 */
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import {
  OPERATION_FORM_STATUS_BADGE_CLASS,
  SYSTEM_ROLE,
  PLANNER_EDITABLE_STATUSES,
} from "@/lib/constants";
import { OperationStatusActions } from "./OperationStatusActions";
import { OperationCreateForm } from "./OperationCreateForm";
import { OperationDetailView } from "./OperationDetailView";

// ── Types ──────────────────────────────────────────────────────────

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
  audit_logs: {
    id: number;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
    changed_by_email: string;
  }[];
  comments: {
    id: number;
    content: string;
    created_at: string;
    author_email: string;
    author_name: string;
  }[];
  linked_orders?: { id: number; status: number }[];
}

// ── Main Component ─────────────────────────────────────────────────

export function OperationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  const role = user?.system_role ?? "";
  const isPlanner = role === SYSTEM_ROLE.PLANNER;
  const isSupervisor = role === SYSTEM_ROLE.SUPERVISOR;

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

  // ── Post-realization notes state ───────────────────────────────
  const [postRealizationNotes, setPostRealizationNotes] = useState("");

  // ── Reject/Resign confirm dialog state ─────────────────────────
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);

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
      setPostRealizationNotes(operation.post_realization_notes ?? "");
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
        body.post_realization_notes = postRealizationNotes || null;
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
      const res = await fetch(`/api/operations/${id}/kml`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
        credentials: 'include',
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

    // Client-side validation for required fields
    if (!orderNumber.trim()) {
      setError(t('operations.validationOrderNumberRequired'));
      return;
    }
    if (!shortDescription.trim()) {
      setError(t('operations.validationShortDescriptionRequired'));
      return;
    }
    if (activityTypes.length === 0) {
      setError(t('operations.validationActivityTypeRequired'));
      return;
    }

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
  const canEdit = isSupervisor || (isPlanner && (PLANNER_EDITABLE_STATUSES as readonly number[]).includes(currentStatus));

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
            <Badge className={OPERATION_FORM_STATUS_BADGE_CLASS[currentStatus] ?? ""}>
              {t(`operations.status${currentStatus}`, { defaultValue: `Status ${currentStatus}` })}
            </Badge>
          )}
        </div>
        {!isCreate && operation && (
          <p className="text-sm text-muted-foreground mt-1">
            {t('operations.createdBy', { email: operation.created_by_email })}
            {operation.created_at &&
              ` \u2022 ${new Date(operation.created_at).toLocaleString("pl-PL")}`}
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 mb-4">
          <p className="text-sm text-destructive-foreground">{error}</p>
        </div>
      )}

      {/* Render create form OR detail view + status actions */}
      {isCreate ? (
        <OperationCreateForm
          orderNumber={orderNumber}
          shortDescription={shortDescription}
          activityTypes={activityTypes}
          additionalInfo={additionalInfo}
          contactEmails={contactEmails}
          proposedDateEarliest={proposedDateEarliest}
          proposedDateLatest={proposedDateLatest}
          onOrderNumberChange={setOrderNumber}
          onShortDescriptionChange={setShortDescription}
          onActivityToggle={handleActivityToggle}
          onAdditionalInfoChange={setAdditionalInfo}
          onContactEmailsChange={setContactEmails}
          onProposedDateEarliestChange={setProposedDateEarliest}
          onProposedDateLatestChange={setProposedDateLatest}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/operations")}
          isSaving={saveMutation.isPending}
        />
      ) : operation ? (
        <>
          <OperationStatusActions
            status={currentStatus}
            isSupervisor={isSupervisor}
            isPlanner={isPlanner}
            onConfirm={() => {
              setConfirmPlannedEarliest(operation.proposed_date_earliest ?? "");
              setConfirmPlannedLatest(operation.proposed_date_latest ?? "");
              setShowConfirmDialog(true);
            }}
            onReject={() => setShowRejectDialog(true)}
            onResign={() => setShowResignDialog(true)}
            rejectPending={rejectMutation.isPending}
            resignPending={resignMutation.isPending}
          />
          <OperationDetailView
            operation={operation}
            canEdit={canEdit}
            isSupervisor={isSupervisor}
            orderNumber={orderNumber}
            shortDescription={shortDescription}
            activityTypes={activityTypes}
            additionalInfo={additionalInfo}
            contactEmails={contactEmails}
            proposedDateEarliest={proposedDateEarliest}
            proposedDateLatest={proposedDateLatest}
            plannedDateEarliest={plannedDateEarliest}
            plannedDateLatest={plannedDateLatest}
            postRealizationNotes={postRealizationNotes}
            onOrderNumberChange={setOrderNumber}
            onShortDescriptionChange={setShortDescription}
            onActivityToggle={handleActivityToggle}
            onAdditionalInfoChange={setAdditionalInfo}
            onContactEmailsChange={setContactEmails}
            onProposedDateEarliestChange={setProposedDateEarliest}
            onProposedDateLatestChange={setProposedDateLatest}
            onPlannedDateEarliestChange={setPlannedDateEarliest}
            onPlannedDateLatestChange={setPlannedDateLatest}
            onPostRealizationNotesChange={setPostRealizationNotes}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/operations")}
            isSaving={saveMutation.isPending}
            kmlFile={kmlFile}
            onKmlFileChange={setKmlFile}
            onKmlUpload={handleKmlUpload}
            kmlUploading={kmlUploading}
            kmlError={kmlError}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            onAddComment={() => commentMutation.mutate()}
            commentPending={commentMutation.isPending}
          />
        </>
      ) : null}

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

      {/* Reject confirm dialog */}
      <Dialog open={showRejectDialog} onOpenChange={() => setShowRejectDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('operations.confirmReject')}</DialogTitle>
            <DialogDescription>
              {t('operations.confirmRejectDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                rejectMutation.mutate();
                setShowRejectDialog(false);
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? t('operations.rejecting') : t('operations.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resign confirm dialog */}
      <Dialog open={showResignDialog} onOpenChange={() => setShowResignDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('operations.confirmResign')}</DialogTitle>
            <DialogDescription>
              {t('operations.confirmResignDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResignDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resignMutation.mutate();
                setShowResignDialog(false);
              }}
              disabled={resignMutation.isPending}
            >
              {resignMutation.isPending ? t('operations.resigning') : t('operations.resign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
