/**
 * OrderFormPage -- dual create/detail orchestrator for flight orders.
 *
 * Create mode:  /orders/new  -- renders <OrderCreateForm />
 * Detail mode:  /orders/:id  -- renders <OrderStatusActions /> + <OrderDetailView />
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Pencil } from "lucide-react";
import { ORDER_FORM_STATUS_BADGE_CLASS, SYSTEM_ROLE } from "@/lib/constants";
import { OrderStatusActions } from "./OrderStatusActions";
import { OrderCreateForm } from "./OrderCreateForm";
import { OrderDetailView } from "./OrderDetailView";

// ── Types ──────────────────────────────────────────────────────────

interface CrewMemberOption {
  id: number;
  first_name: string;
  last_name: string;
  weight: number;
  role: string;
  email: string;
}

interface HelicopterOption {
  id: number;
  registration_number: string;
  helicopter_type: string;
  max_payload_weight: number;
  max_crew: number;
  status: string;
  range_km: number;
}

interface LandingSiteOption {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface OperationOption {
  id: number;
  short_description: string | null;
  planned_date_earliest: string | null;
  planned_date_latest: string | null;
  status: number;
  route_coordinates?: [number, number][] | null;
}

interface CrewMemberBrief {
  id: number;
  name: string;
  weight: number;
}

interface OperationBrief {
  id: number;
  short_description: string | null;
  status: number;
}

interface FlightOrderDetail {
  id: number;
  planned_start_datetime: string;
  planned_end_datetime: string;
  pilot_id: number;
  pilot_name: string;
  status: number;
  helicopter_id: number;
  helicopter_registration: string;
  crew_weight: number | null;
  start_landing_site_id: number;
  start_landing_site_name: string;
  end_landing_site_id: number;
  end_landing_site_name: string;
  estimated_route_km: number | null;
  actual_start_datetime: string | null;
  actual_end_datetime: string | null;
  created_by_id: number;
  created_by_email: string;
  created_at: string | null;
  crew_members: CrewMemberBrief[];
  operations: OperationBrief[];
}

// ── Operation detail with route_coordinates (fetched individually) ──

interface OperationDetailForMap {
  id: number;
  route_coordinates: [number, number][] | null;
}

// ── Helpers ─────────────────────────────────────────────────────────

function toDatePart(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
function toTimePart(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = iso.slice(11, 16);
  return t || "";
}
function composeDatetime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

function parseErrors(detail: string): string[] {
  // API may return a JSON array string or a plain string
  try {
    const parsed = JSON.parse(detail);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    // not JSON
  }
  // May already be a plain error message
  if (detail.startsWith("[")) {
    // Attempt to parse stringified array
    try {
      const arr = JSON.parse(detail.replace(/'/g, '"'));
      if (Array.isArray(arr)) return arr as string[];
    } catch {
      // fall through
    }
  }
  return [detail];
}

// ── Main Component ─────────────────────────────────────────────────

export function OrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();

  const role = user?.system_role ?? "";
  const isPilot = role === SYSTEM_ROLE.PILOT;
  const isSupervisor = role === SYSTEM_ROLE.SUPERVISOR;

  // ── Form state ─────────────────────────────────────────────────
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedStartTime, setPlannedStartTime] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [plannedEndTime, setPlannedEndTime] = useState("");
  const [helicopterId, setHelicopterId] = useState<string>("");
  const [selectedCrewIds, setSelectedCrewIds] = useState<number[]>([]);
  const [startSiteId, setStartSiteId] = useState<string>("");
  const [endSiteId, setEndSiteId] = useState<string>("");
  const [selectedOpIds, setSelectedOpIds] = useState<number[]>([]);
  const [estimatedRouteKm, setEstimatedRouteKm] = useState<string>("");
  const [actualStartDate, setActualStartDate] = useState("");
  const [actualStartTime, setActualStartTime] = useState("");
  const [actualEndDate, setActualEndDate] = useState("");
  const [actualEndTime, setActualEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Edit mode state ────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

  // ── Confirm dialog state ───────────────────────────────────────
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showNotCompletedDialog, setShowNotCompletedDialog] = useState(false);

  // ── Data queries for create/edit mode ───────────────────────────
  const { data: helicopters = [] } = useQuery<HelicopterOption[]>({
    queryKey: ["helicopters"],
    queryFn: () => apiFetch<HelicopterOption[]>("/helicopters"),
    enabled: isCreate || isEditing,
  });

  const { data: allCrew = [] } = useQuery<CrewMemberOption[]>({
    queryKey: ["crew-members"],
    queryFn: () => apiFetch<CrewMemberOption[]>("/crew-members"),
    enabled: isCreate || isEditing,
  });

  const { data: landingSites = [] } = useQuery<LandingSiteOption[]>({
    queryKey: ["landing-sites"],
    queryFn: () => apiFetch<LandingSiteOption[]>("/landing-sites"),
    enabled: isCreate || isEditing,
  });

  const { data: confirmedOps = [] } = useQuery<OperationOption[]>({
    queryKey: ["operations", "confirmed"],
    queryFn: () => apiFetch<OperationOption[]>("/operations?op_status=3"),
    enabled: isCreate || isEditing,
  });

  // Fetch operation details for map preview in create/edit mode
  const { data: createModeOpDetails = [] } = useQuery<OperationDetailForMap[]>({
    queryKey: ['order-create-operations-map', selectedOpIds],
    queryFn: async () => {
      if (selectedOpIds.length === 0) return [];
      const results = await Promise.all(
        selectedOpIds.map(opId =>
          apiFetch<{ id: number; route_coordinates: [number, number][] | null }>(`/operations/${opId}`)
        )
      );
      return results.map(r => ({ id: r.id, route_coordinates: r.route_coordinates }));
    },
    enabled: (isCreate || isEditing) && selectedOpIds.length > 0,
  });

  // ── Fetch order for detail mode ────────────────────────────────
  const { data: order, isLoading: loadingOrder } = useQuery<FlightOrderDetail>({
    queryKey: ["order", id],
    queryFn: () => apiFetch<FlightOrderDetail>(`/orders/${id}`),
    enabled: !isCreate,
  });

  // Fetch operation details for map (to get route_coordinates)
  const operationIds = order?.operations.map((op) => op.id) ?? [];
  const { data: operationDetails = [] } = useQuery<OperationDetailForMap[]>({
    queryKey: ["order-operations-map", id, operationIds],
    queryFn: async () => {
      if (operationIds.length === 0) return [];
      const results = await Promise.all(
        operationIds.map((opId) =>
          apiFetch<{ id: number; route_coordinates: [number, number][] | null }>(
            `/operations/${opId}`
          )
        )
      );
      return results.map((r) => ({
        id: r.id,
        route_coordinates: r.route_coordinates,
      }));
    },
    enabled: !isCreate && operationIds.length > 0,
  });

  // Fetch landing sites for map in detail mode
  const { data: allSitesForMap = [] } = useQuery<LandingSiteOption[]>({
    queryKey: ["landing-sites"],
    queryFn: () => apiFetch<LandingSiteOption[]>("/landing-sites"),
    enabled: !isCreate,
  });

  // Populate form from fetched order
  useEffect(() => {
    if (order) {
      setActualStartDate(toDatePart(order.actual_start_datetime));
      setActualStartTime(toTimePart(order.actual_start_datetime));
      setActualEndDate(toDatePart(order.actual_end_datetime));
      setActualEndTime(toTimePart(order.actual_end_datetime));
    }
  }, [order]);

  // Pre-populate create-form state when entering edit mode
  useEffect(() => {
    if (isEditing && order) {
      setPlannedStartDate(toDatePart(order.planned_start_datetime));
      setPlannedStartTime(toTimePart(order.planned_start_datetime));
      setPlannedEndDate(toDatePart(order.planned_end_datetime));
      setPlannedEndTime(toTimePart(order.planned_end_datetime));
      setHelicopterId(String(order.helicopter_id));
      setSelectedCrewIds(order.crew_members.map((c) => c.id));
      setStartSiteId(String(order.start_landing_site_id));
      setEndSiteId(String(order.end_landing_site_id));
      setSelectedOpIds(order.operations.map((o) => o.id));
      setEstimatedRouteKm(
        order.estimated_route_km != null ? String(order.estimated_route_km) : ""
      );
    }
  }, [isEditing, order]);

  // ── Create mutation ────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        planned_start_datetime: plannedStartDate
          ? new Date(composeDatetime(plannedStartDate, plannedStartTime)).toISOString()
          : "",
        planned_end_datetime: plannedEndDate
          ? new Date(composeDatetime(plannedEndDate, plannedEndTime)).toISOString()
          : "",
        helicopter_id: Number(helicopterId),
        crew_member_ids: selectedCrewIds,
        start_landing_site_id: Number(startSiteId),
        end_landing_site_id: Number(endSiteId),
        operation_ids: selectedOpIds,
        estimated_route_km: Number(estimatedRouteKm),
      };
      return apiFetch<FlightOrderDetail>("/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/orders/${data.id}`);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        const errors = parseErrors(err.detail);
        setValidationErrors(errors);
        setError(null);
      } else {
        setError(err.message);
        setValidationErrors([]);
      }
    },
  });

  // ── Update mutation (for actual datetimes) ─────────────────────
  const updateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      const composedActualStart = composeDatetime(actualStartDate, actualStartTime);
      const composedActualEnd = composeDatetime(actualEndDate, actualEndTime);
      if (composedActualStart)
        body.actual_start_datetime = new Date(composedActualStart).toISOString();
      if (composedActualEnd)
        body.actual_end_datetime = new Date(composedActualEnd).toISOString();
      return apiFetch<FlightOrderDetail>(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setError(null);
      setValidationErrors([]);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setValidationErrors(parseErrors(err.detail));
      } else {
        setError(err.message);
      }
    },
  });

  // ── Edit mutation (full field update) ───────────────────────────
  const editMutation = useMutation({
    mutationFn: async () => {
      const body = {
        planned_start_datetime: plannedStartDate
          ? new Date(composeDatetime(plannedStartDate, plannedStartTime)).toISOString()
          : "",
        planned_end_datetime: plannedEndDate
          ? new Date(composeDatetime(plannedEndDate, plannedEndTime)).toISOString()
          : "",
        helicopter_id: Number(helicopterId),
        crew_member_ids: selectedCrewIds,
        start_landing_site_id: Number(startSiteId),
        end_landing_site_id: Number(endSiteId),
        operation_ids: selectedOpIds,
        estimated_route_km: Number(estimatedRouteKm),
      };
      return apiFetch<FlightOrderDetail>(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsEditing(false);
      setError(null);
      setValidationErrors([]);
      setFieldErrors({});
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        const errors = parseErrors(err.detail);
        setValidationErrors(errors);
        setError(null);
      } else {
        setError(err.message);
        setValidationErrors([]);
      }
    },
  });

  // ── Status transition mutations ────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlightOrderDetail>(`/orders/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setError(null);
      setValidationErrors([]);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) setValidationErrors(parseErrors(err.detail));
      else setError(err.message);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlightOrderDetail>(`/orders/${id}/accept`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setError(null);
      setValidationErrors([]);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) setValidationErrors(parseErrors(err.detail));
      else setError(err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlightOrderDetail>(`/orders/${id}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setError(null);
      setValidationErrors([]);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) setValidationErrors(parseErrors(err.detail));
      else setError(err.message);
    },
  });

  const completePartialMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlightOrderDetail>(`/orders/${id}/complete-partial`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setError(null);
      setValidationErrors([]);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) setValidationErrors(parseErrors(err.detail));
      else setError(err.message);
    },
  });

  const completeFullMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlightOrderDetail>(`/orders/${id}/complete-full`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setError(null);
      setValidationErrors([]);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) setValidationErrors(parseErrors(err.detail));
      else setError(err.message);
    },
  });

  const notCompletedMutation = useMutation({
    mutationFn: () =>
      apiFetch<FlightOrderDetail>(`/orders/${id}/not-completed`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setError(null);
      setValidationErrors([]);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) setValidationErrors(parseErrors(err.detail));
      else setError(err.message);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────
  function handleCrewToggle(crewId: number) {
    setSelectedCrewIds((prev) =>
      prev.includes(crewId)
        ? prev.filter((id) => id !== crewId)
        : [...prev, crewId]
    );
  }

  function handleOpToggle(opId: number) {
    setSelectedOpIds((prev) =>
      prev.includes(opId)
        ? prev.filter((id) => id !== opId)
        : [...prev, opId]
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    // Client-side validation for required fields
    const errors: Record<string, string> = {};
    if (!plannedStartDate) errors.plannedStart = t('orders.validationFieldRequired');
    if (!plannedEndDate) errors.plannedEnd = t('orders.validationFieldRequired');
    if (!helicopterId) errors.helicopter = t('orders.validationHelicopterRequired');
    if (!startSiteId) errors.startSite = t('orders.validationStartSiteRequired');
    if (!endSiteId) errors.endSite = t('orders.validationEndSiteRequired');
    if (selectedOpIds.length === 0) errors.operations = t('orders.validationOperationsRequired');
    if (!estimatedRouteKm) errors.routeKm = t('orders.validationRouteKmRequired');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    createMutation.mutate();
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    // Client-side validation for required fields (same as create)
    const errors: Record<string, string> = {};
    if (!plannedStartDate) errors.plannedStart = t('orders.validationFieldRequired');
    if (!plannedEndDate) errors.plannedEnd = t('orders.validationFieldRequired');
    if (!helicopterId) errors.helicopter = t('orders.validationHelicopterRequired');
    if (!startSiteId) errors.startSite = t('orders.validationStartSiteRequired');
    if (!endSiteId) errors.endSite = t('orders.validationEndSiteRequired');
    if (selectedOpIds.length === 0) errors.operations = t('orders.validationOperationsRequired');
    if (!estimatedRouteKm) errors.routeKm = t('orders.validationRouteKmRequired');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    editMutation.mutate();
  }

  // ── Loading ────────────────────────────────────────────────────
  if (!isCreate && loadingOrder) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('orders.loading')}</p>
      </div>
    );
  }

  const currentStatus = order?.status ?? 1;

  // Map data for detail mode
  const mapOperations = operationDetails
    .filter((op) => op.route_coordinates && op.route_coordinates.length > 0)
    .map((op) => ({
      id: op.id,
      route_coordinates: op.route_coordinates!,
    }));

  const startSiteForMap = allSitesForMap.find(
    (s) => s.id === order?.start_landing_site_id
  );
  const endSiteForMap = allSitesForMap.find(
    (s) => s.id === order?.end_landing_site_id
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/orders")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('orders.backToList')}
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {isCreate
              ? t('orders.newOrder')
              : isEditing
                ? t('orders.editOrder')
                : t('orders.orderNumber', { id: order?.id })}
          </h1>
          {!isCreate && !isEditing && (
            <Badge className={ORDER_FORM_STATUS_BADGE_CLASS[currentStatus] ?? ""}>
              {t(`orders.status${currentStatus}`, { defaultValue: `Status ${currentStatus}` })}
            </Badge>
          )}
          {!isCreate && !isEditing &&
            ((isPilot && currentStatus === 1) ||
             (isSupervisor && currentStatus >= 1 && currentStatus <= 4)) && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </div>
        {!isCreate && order && (
          <p className="text-sm text-muted-foreground mt-1">
            {t('orders.pilotLabel', { name: order.pilot_name })} • {t('orders.createdBy', { email: order.created_by_email })}
            {order.created_at &&
              ` • ${new Date(order.created_at).toLocaleString("pl-PL")}`}
          </p>
        )}
      </div>

      {/* Error banners */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 mb-4">
          <p className="text-sm text-destructive-foreground">{error}</p>
        </div>
      )}
      {validationErrors.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3 mb-4">
          <p className="text-sm font-semibold text-red-700 mb-1">
            {t('orders.safetyValidationFailed')}
          </p>
          <ul className="list-disc list-inside text-sm text-destructive-foreground">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Render create form, edit form, OR detail view + status actions */}
      {isCreate ? (
        <OrderCreateForm
          userFullName={user ? `${user.first_name} ${user.last_name}` : ""}
          userEmail={user?.email ?? ""}
          plannedStartDate={plannedStartDate}
          plannedStartTime={plannedStartTime}
          plannedEndDate={plannedEndDate}
          plannedEndTime={plannedEndTime}
          helicopterId={helicopterId}
          selectedCrewIds={selectedCrewIds}
          startSiteId={startSiteId}
          endSiteId={endSiteId}
          selectedOpIds={selectedOpIds}
          estimatedRouteKm={estimatedRouteKm}
          helicopters={helicopters}
          allCrew={allCrew}
          landingSites={landingSites}
          confirmedOps={confirmedOps}
          createModeOpDetails={createModeOpDetails}
          onPlannedStartDateChange={setPlannedStartDate}
          onPlannedStartTimeChange={setPlannedStartTime}
          onPlannedEndDateChange={setPlannedEndDate}
          onPlannedEndTimeChange={setPlannedEndTime}
          onHelicopterIdChange={setHelicopterId}
          onCrewToggle={handleCrewToggle}
          onStartSiteIdChange={setStartSiteId}
          onEndSiteIdChange={setEndSiteId}
          onOpToggle={handleOpToggle}
          onEstimatedRouteKmChange={setEstimatedRouteKm}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/orders")}
          isCreating={createMutation.isPending}
          fieldErrors={fieldErrors}
        />
      ) : isEditing && order ? (
        <OrderCreateForm
          userFullName={order.pilot_name}
          userEmail={user?.email ?? ""}
          plannedStartDate={plannedStartDate}
          plannedStartTime={plannedStartTime}
          plannedEndDate={plannedEndDate}
          plannedEndTime={plannedEndTime}
          helicopterId={helicopterId}
          selectedCrewIds={selectedCrewIds}
          startSiteId={startSiteId}
          endSiteId={endSiteId}
          selectedOpIds={selectedOpIds}
          estimatedRouteKm={estimatedRouteKm}
          helicopters={helicopters}
          allCrew={allCrew}
          landingSites={landingSites}
          confirmedOps={confirmedOps}
          createModeOpDetails={createModeOpDetails}
          onPlannedStartDateChange={setPlannedStartDate}
          onPlannedStartTimeChange={setPlannedStartTime}
          onPlannedEndDateChange={setPlannedEndDate}
          onPlannedEndTimeChange={setPlannedEndTime}
          onHelicopterIdChange={setHelicopterId}
          onCrewToggle={handleCrewToggle}
          onStartSiteIdChange={setStartSiteId}
          onEndSiteIdChange={setEndSiteId}
          onOpToggle={handleOpToggle}
          onEstimatedRouteKmChange={setEstimatedRouteKm}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
          isCreating={editMutation.isPending}
          fieldErrors={fieldErrors}
          submitLabel={t('orders.saveChanges')}
          cancelLabel={t('common.cancel')}
        />
      ) : order ? (
        <>
          <OrderStatusActions
            status={currentStatus}
            isPilot={isPilot}
            isSupervisor={isSupervisor}
            hasActualTimes={!!order.actual_start_datetime && !!order.actual_end_datetime}
            onSubmit={() => submitMutation.mutate()}
            onAccept={() => acceptMutation.mutate()}
            onReject={() => setShowRejectDialog(true)}
            onCompletePartial={() => completePartialMutation.mutate()}
            onCompleteFull={() => completeFullMutation.mutate()}
            onNotCompleted={() => setShowNotCompletedDialog(true)}
            submitPending={submitMutation.isPending}
            acceptPending={acceptMutation.isPending}
            rejectPending={rejectMutation.isPending}
            completePartialPending={completePartialMutation.isPending}
            completeFullPending={completeFullMutation.isPending}
            notCompletedPending={notCompletedMutation.isPending}
          />
          <OrderDetailView
            order={order}
            isPilot={isPilot}
            currentStatus={currentStatus}
            actualStartDate={actualStartDate}
            actualStartTime={actualStartTime}
            actualEndDate={actualEndDate}
            actualEndTime={actualEndTime}
            onActualStartDateChange={setActualStartDate}
            onActualStartTimeChange={setActualStartTime}
            onActualEndDateChange={setActualEndDate}
            onActualEndTimeChange={setActualEndTime}
            onSaveActualTimes={() => updateMutation.mutate()}
            savingActualTimes={updateMutation.isPending}
            mapOperations={mapOperations}
            startSiteForMap={
              startSiteForMap
                ? { name: startSiteForMap.name, lat: startSiteForMap.latitude, lng: startSiteForMap.longitude }
                : null
            }
            endSiteForMap={
              endSiteForMap
                ? { name: endSiteForMap.name, lat: endSiteForMap.latitude, lng: endSiteForMap.longitude }
                : null
            }
          />
        </>
      ) : null}

      {/* Reject confirm dialog */}
      <Dialog open={showRejectDialog} onOpenChange={() => setShowRejectDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orders.confirmReject')}</DialogTitle>
            <DialogDescription>
              {t('orders.confirmRejectDesc')}
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
              {rejectMutation.isPending ? t('orders.rejecting') : t('orders.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not completed confirm dialog */}
      <Dialog open={showNotCompletedDialog} onOpenChange={() => setShowNotCompletedDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orders.confirmNotCompleted')}</DialogTitle>
            <DialogDescription>
              {t('orders.confirmNotCompletedDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotCompletedDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                notCompletedMutation.mutate();
                setShowNotCompletedDialog(false);
              }}
              disabled={notCompletedMutation.isPending}
            >
              {notCompletedMutation.isPending ? t('orders.processing') : t('orders.notCompleted')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
