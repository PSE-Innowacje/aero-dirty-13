/**
 * OrderFormPage — dual create/detail page for flight orders.
 *
 * Create mode:  /orders/new  — helicopter dropdown, crew multi-select with live weight calc,
 *   operation multi-select (status=3 only), landing site dropdowns, safety validation errors.
 * Detail mode:  /orders/:id  — read-only fields, status action buttons, combined map.
 */
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { OrderMap } from "@/components/maps/OrderMap";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface CrewMemberOption {
  id: number;
  first_name: string;
  last_name: string;
  weight: number;
  role: string;
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

// ── Constants ──────────────────────────────────────────────────────

// Status labels now use t('orders.statusN') via i18n

const STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-blue-500 text-white",
  2: "bg-amber-500 text-white",
  3: "bg-red-500 text-white",
  4: "bg-green-600 text-white",
  5: "bg-orange-500 text-white",
  6: "bg-green-600 text-white",
  7: "bg-gray-400 text-white",
};

// ── Helpers ─────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  // ISO string → datetime-local input format (YYYY-MM-DDTHH:mm)
  return iso.slice(0, 16);
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
  const isPilot = role === "Pilot";
  const isSupervisor = role === "Osoba nadzorująca";

  // ── Form state ─────────────────────────────────────────────────
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [helicopterId, setHelicopterId] = useState<string>("");
  const [selectedCrewIds, setSelectedCrewIds] = useState<number[]>([]);
  const [startSiteId, setStartSiteId] = useState<string>("");
  const [endSiteId, setEndSiteId] = useState<string>("");
  const [selectedOpIds, setSelectedOpIds] = useState<number[]>([]);
  const [estimatedRouteKm, setEstimatedRouteKm] = useState<string>("");
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ── Data queries for create mode ───────────────────────────────
  const { data: helicopters = [] } = useQuery<HelicopterOption[]>({
    queryKey: ["helicopters"],
    queryFn: () => apiFetch<HelicopterOption[]>("/helicopters"),
    enabled: isCreate,
  });

  const { data: allCrew = [] } = useQuery<CrewMemberOption[]>({
    queryKey: ["crew-members"],
    queryFn: () => apiFetch<CrewMemberOption[]>("/crew-members"),
    enabled: isCreate,
  });

  const { data: landingSites = [] } = useQuery<LandingSiteOption[]>({
    queryKey: ["landing-sites"],
    queryFn: () => apiFetch<LandingSiteOption[]>("/landing-sites"),
    enabled: isCreate,
  });

  const { data: confirmedOps = [] } = useQuery<OperationOption[]>({
    queryKey: ["operations", "confirmed"],
    queryFn: () => apiFetch<OperationOption[]>("/operations?op_status=3"),
    enabled: isCreate,
  });

  // Active helicopters only
  const activeHelicopters = useMemo(
    () => helicopters.filter((h) => h.status === "aktywny"),
    [helicopters]
  );

  // Selected helicopter for weight comparison
  const selectedHelicopter = useMemo(
    () => activeHelicopters.find((h) => h.id === Number(helicopterId)),
    [activeHelicopters, helicopterId]
  );

  // ── Live weight calculation ────────────────────────────────────

  const selectedCrewMembers = useMemo(
    () => allCrew.filter((c) => selectedCrewIds.includes(c.id)),
    [allCrew, selectedCrewIds]
  );

  const totalCrewWeight = useMemo(() => {
    const crewWeight = selectedCrewMembers.reduce((sum, c) => sum + c.weight, 0);
    // Pilot weight is auto-added by backend; show it here for display
    // We'll estimate pilot weight from user's crew profile if available
    return crewWeight;
  }, [selectedCrewMembers]);

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
      setActualStart(toDatetimeLocal(order.actual_start_datetime));
      setActualEnd(toDatetimeLocal(order.actual_end_datetime));
    }
  }, [order]);

  // ── Create mutation ────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        planned_start_datetime: plannedStart
          ? new Date(plannedStart).toISOString()
          : "",
        planned_end_datetime: plannedEnd
          ? new Date(plannedEnd).toISOString()
          : "",
        helicopter_id: Number(helicopterId),
        crew_member_ids: selectedCrewIds,
        start_landing_site_id: Number(startSiteId),
        end_landing_site_id: Number(endSiteId),
        operation_ids: selectedOpIds,
        estimated_route_km: estimatedRouteKm
          ? Number(estimatedRouteKm)
          : null,
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
      if (actualStart)
        body.actual_start_datetime = new Date(actualStart).toISOString();
      if (actualEnd)
        body.actual_end_datetime = new Date(actualEnd).toISOString();
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
    createMutation.mutate();
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

  // Map data
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
            {isCreate ? t('orders.newOrder') : t('orders.orderNumber', { id: order?.id })}
          </h1>
          {!isCreate && (
            <Badge className={STATUS_BADGE_CLASS[currentStatus] ?? ""}>
              {t(`orders.status${currentStatus}`, { defaultValue: `Status ${currentStatus}` })}
            </Badge>
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

      {/* Status action buttons (detail mode) */}
      {!isCreate && (
        <OrderStatusActions
          status={currentStatus}
          isPilot={isPilot}
          isSupervisor={isSupervisor}
          onSubmit={() => submitMutation.mutate()}
          onAccept={() => acceptMutation.mutate()}
          onReject={() => rejectMutation.mutate()}
          onCompletePartial={() => completePartialMutation.mutate()}
          onCompleteFull={() => completeFullMutation.mutate()}
          onNotCompleted={() => notCompletedMutation.mutate()}
          submitPending={submitMutation.isPending}
          acceptPending={acceptMutation.isPending}
          rejectPending={rejectMutation.isPending}
          completePartialPending={completePartialMutation.isPending}
          completeFullPending={completeFullMutation.isPending}
          notCompletedPending={notCompletedMutation.isPending}
        />
      )}

      {isCreate ? (
        /* ═══════════ CREATE MODE ═══════════ */
        <div className="rounded-md bg-surface-container-low p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pilot — auto-filled, read-only */}
            <div className="space-y-2">
              <Label>{t('orders.pilotAutoFilled')}</Label>
              <Input
                value={
                  user
                    ? `${user.first_name} ${user.last_name}`
                    : ""
                }
                disabled
                className="bg-muted"
              />
            </div>

            {/* Planned dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plannedStart">{t('orders.plannedStartLabel')}</Label>
                <Input
                  id="plannedStart"
                  type="datetime-local"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedEnd">{t('orders.plannedEndLabel')}</Label>
                <Input
                  id="plannedEnd"
                  type="datetime-local"
                  value={plannedEnd}
                  onChange={(e) => setPlannedEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Helicopter dropdown */}
            <div className="space-y-2">
              <Label htmlFor="helicopter">{t('orders.helicopterLabel')}</Label>
              {activeHelicopters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('orders.noActiveHelicopters')}
                </p>
              ) : (
                <Select
                  id="helicopter"
                  value={helicopterId}
                  onChange={(e) => setHelicopterId(e.target.value)}
                  required
                >
                  <option value="">{t('orders.selectHelicopter')}</option>
                  {activeHelicopters.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.registration_number} — {h.helicopter_type} ({t('orders.helicopterOptionSuffix', { maxPayload: h.max_payload_weight, range: h.range_km })})
                    </option>
                  ))}
                </Select>
              )}
            </div>

            {/* Crew multi-select with weight */}
            <div className="space-y-2">
              <Label>{t('orders.crewLabel')}</Label>
              {allCrew.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('orders.noCrewMembers')}
                </p>
              ) : (
                <div className="rounded-md border p-3 max-h-48 overflow-y-auto space-y-1">
                  {allCrew.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-sm py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCrewIds.includes(c.id)}
                        onChange={() => handleCrewToggle(c.id)}
                        className="rounded border-input"
                      />
                      <span>
                        {c.first_name} {c.last_name}
                      </span>
                      <span className="text-muted-foreground">
                        ({c.weight} kg, {c.role})
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {/* Weight summary */}
              <div className="text-sm mt-1">
                <span className="font-medium">{t('orders.crewWeight')}</span>{" "}
                <span
                  className={
                    selectedHelicopter &&
                    totalCrewWeight > selectedHelicopter.max_payload_weight
                      ? "text-destructive-foreground font-bold"
                      : ""
                  }
                >
                  {totalCrewWeight} kg
                </span>
                {selectedHelicopter && (
                  <span className="text-muted-foreground">
                    {" "}
                    / {selectedHelicopter.max_payload_weight} kg max
                    {totalCrewWeight > selectedHelicopter.max_payload_weight && (
                      <span className="text-destructive-foreground ml-1">
                        {t('orders.weightExceeded')}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Landing sites */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startSite">{t('orders.startLandingSite')}</Label>
                <Select
                  id="startSite"
                  value={startSiteId}
                  onChange={(e) => setStartSiteId(e.target.value)}
                  required
                >
                  <option value="">{t('orders.selectLandingSite')}</option>
                  {landingSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endSite">{t('orders.endLandingSite')}</Label>
                <Select
                  id="endSite"
                  value={endSiteId}
                  onChange={(e) => setEndSiteId(e.target.value)}
                  required
                >
                  <option value="">{t('orders.selectLandingSite')}</option>
                  {landingSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Operations multi-select */}
            <div className="space-y-2">
              <Label>{t('orders.operationsConfirmed')}</Label>
              {confirmedOps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('orders.noConfirmedOperations')}
                </p>
              ) : (
                <div className="rounded-md border p-3 max-h-48 overflow-y-auto space-y-1">
                  {confirmedOps.map((op) => (
                    <label
                      key={op.id}
                      className="flex items-center gap-2 text-sm py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOpIds.includes(op.id)}
                        onChange={() => handleOpToggle(op.id)}
                        className="rounded border-input"
                      />
                      <span>
                        #{op.id} — {op.short_description || t('orders.noDescription')}
                      </span>
                      {op.planned_date_earliest && (
                        <span className="text-muted-foreground">
                          ({op.planned_date_earliest}
                          {op.planned_date_latest
                            ? ` – ${op.planned_date_latest}`
                            : ""}
                          )
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Estimated route km */}
            <div className="space-y-2">
              <Label htmlFor="routeKm">{t('orders.estimatedRouteKm')}</Label>
              <Input
                id="routeKm"
                type="number"
                min={0}
                value={estimatedRouteKm}
                onChange={(e) => setEstimatedRouteKm(e.target.value)}
                placeholder={t('orders.optional')}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? t('orders.creating')
                  : t('orders.createOrder')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/orders")}
              >
                {t('orders.cancel')}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* ═══════════ DETAIL MODE ═══════════ */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Order details */}
          <div className="space-y-6">
            <div className="rounded-md bg-surface-container-low p-6 space-y-4">
              <h2 className="text-lg font-semibold">{t('orders.orderDetails')}</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">
                    {t('orders.plannedStartLabel')}
                  </Label>
                  <p className="text-sm font-medium">
                    {order
                      ? new Date(
                          order.planned_start_datetime
                        ).toLocaleString("pl-PL")
                      : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    {t('orders.plannedEndLabel')}
                  </Label>
                  <p className="text-sm font-medium">
                    {order
                      ? new Date(
                          order.planned_end_datetime
                        ).toLocaleString("pl-PL")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('orders.helicopter')}</Label>
                  <p className="text-sm font-medium">
                    {order?.helicopter_registration ?? "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    {t('orders.estimatedRoute')}
                  </Label>
                  <p className="text-sm font-medium">
                    {order?.estimated_route_km != null
                      ? `${order.estimated_route_km} km`
                      : "—"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">{t('orders.crewWeightLabel')}</Label>
                <p className="text-sm font-medium">
                  {order?.crew_weight != null ? `${order.crew_weight} kg` : "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">
                    {t('orders.startLandingSiteLabel')}
                  </Label>
                  <p className="text-sm font-medium">
                    {order?.start_landing_site_name ?? "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    {t('orders.endLandingSiteLabel')}
                  </Label>
                  <p className="text-sm font-medium">
                    {order?.end_landing_site_name ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Actual datetimes — editable by pilot when status=4 */}
            {isPilot && currentStatus === 4 && (
              <div className="rounded-md bg-surface-container-low p-6 space-y-4">
                <h2 className="text-lg font-semibold">
                  {t('orders.actualTimes')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="actualStart">{t('orders.actualStart')}</Label>
                    <Input
                      id="actualStart"
                      type="datetime-local"
                      value={actualStart}
                      onChange={(e) => setActualStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actualEnd">{t('orders.actualEnd')}</Label>
                    <Input
                      id="actualEnd"
                      type="datetime-local"
                      value={actualEnd}
                      onChange={(e) => setActualEnd(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending
                    ? t('orders.savingTimes')
                    : t('orders.saveTimes')}
                </Button>
              </div>
            )}

            {/* Read-only actual datetimes when not editable */}
            {(!isPilot || currentStatus !== 4) &&
              (order?.actual_start_datetime || order?.actual_end_datetime) && (
                <div className="rounded-md bg-surface-container-low p-6 space-y-4">
                  <h2 className="text-lg font-semibold">
                    {t('orders.actualTimes')}
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">
                        {t('orders.actualStart')}
                      </Label>
                      <p className="text-sm font-medium">
                        {order.actual_start_datetime
                          ? new Date(
                              order.actual_start_datetime
                            ).toLocaleString("pl-PL")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        {t('orders.actualEnd')}
                      </Label>
                      <p className="text-sm font-medium">
                        {order.actual_end_datetime
                          ? new Date(
                              order.actual_end_datetime
                            ).toLocaleString("pl-PL")
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Crew members list */}
            <div className="rounded-md bg-surface-container-low p-6">
              <h2 className="text-lg font-semibold mb-3">{t('orders.crewSection')}</h2>
              {order && order.crew_members.length > 0 ? (
                <ul className="space-y-1">
                  {order.crew_members.map((cm) => (
                    <li key={cm.id} className="text-sm">
                      {cm.name}{" "}
                      <span className="text-muted-foreground">
                        ({cm.weight} kg)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t('orders.noCrew')}</p>
              )}
            </div>

            {/* Operations list */}
            <div className="rounded-md bg-surface-container-low p-6">
              <h2 className="text-lg font-semibold mb-3">{t('orders.operationsSection')}</h2>
              {order && order.operations.length > 0 ? (
                <ul className="space-y-1">
                  {order.operations.map((op) => (
                    <li key={op.id} className="text-sm">
                      #{op.id} — {op.short_description ?? t('orders.noDescription')}{" "}
                      <Badge variant="outline" className="ml-1 text-xs">
                        Status {op.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('orders.noLinkedOperations')}
                </p>
              )}
            </div>
          </div>

          {/* Right: Map */}
          <div className="space-y-6">
            {(mapOperations.length > 0 || startSiteForMap || endSiteForMap) && (
              <div className="rounded-md bg-surface-container-low p-6">
                <h2 className="text-lg font-semibold mb-3">
                  {t('orders.routeMap')}
                </h2>
                <OrderMap
                  operations={mapOperations}
                  startLandingSite={
                    startSiteForMap
                      ? {
                          name: startSiteForMap.name,
                          lat: startSiteForMap.latitude,
                          lng: startSiteForMap.longitude,
                        }
                      : null
                  }
                  endLandingSite={
                    endSiteForMap
                      ? {
                          name: endSiteForMap.name,
                          lat: endSiteForMap.latitude,
                          lng: endSiteForMap.longitude,
                        }
                      : null
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── OrderStatusActions sub-component ────────────────────────────────

function OrderStatusActions({
  status,
  isPilot,
  isSupervisor,
  onSubmit,
  onAccept,
  onReject,
  onCompletePartial,
  onCompleteFull,
  onNotCompleted,
  submitPending,
  acceptPending,
  rejectPending,
  completePartialPending,
  completeFullPending,
  notCompletedPending,
}: {
  status: number;
  isPilot: boolean;
  isSupervisor: boolean;
  onSubmit: () => void;
  onAccept: () => void;
  onReject: () => void;
  onCompletePartial: () => void;
  onCompleteFull: () => void;
  onNotCompleted: () => void;
  submitPending: boolean;
  acceptPending: boolean;
  rejectPending: boolean;
  completePartialPending: boolean;
  completeFullPending: boolean;
  notCompletedPending: boolean;
}) {
  const { t } = useTranslation();
  const showSubmit = isPilot && status === 1;
  const showSupervisorActions = isSupervisor && status === 2;
  const showSettlement = isPilot && status === 4;

  if (!showSubmit && !showSupervisorActions && !showSettlement) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {showSubmit && (
        <Button onClick={onSubmit} disabled={submitPending}>
          {submitPending ? t('orders.submitting') : t('orders.submitForAcceptance')}
        </Button>
      )}
      {showSupervisorActions && (
        <>
          <Button
            onClick={onAccept}
            disabled={acceptPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {acceptPending ? t('orders.accepting') : t('orders.accept')}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={rejectPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {rejectPending ? t('orders.rejecting') : t('orders.reject')}
          </Button>
        </>
      )}
      {showSettlement && (
        <>
          <Button
            onClick={onCompletePartial}
            disabled={completePartialPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {completePartialPending
              ? t('orders.processing')
              : t('orders.completePartial')}
          </Button>
          <Button
            onClick={onCompleteFull}
            disabled={completeFullPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {completeFullPending
              ? t('orders.processing')
              : t('orders.completeFull')}
          </Button>
          <Button
            variant="destructive"
            onClick={onNotCompleted}
            disabled={notCompletedPending}
          >
            {notCompletedPending ? t('orders.processing') : t('orders.notCompleted')}
          </Button>
        </>
      )}
    </div>
  );
}
