/**
 * OrderCreateForm -- create-mode form for flight orders.
 *
 * Pilot display (auto-filled), planned dates, helicopter dropdown,
 * crew multi-select with live weight calculation, landing site dropdowns,
 * operations checkboxes (confirmed status=3 only), estimated route km,
 * map preview, and submit/cancel buttons.
 */
import { useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OrderMap } from "@/components/maps/OrderMap";
import { FormLegend } from "@/components/ui/FormLegend";
import { CREW_ROLE } from "@/lib/constants";

// ---- Types for props ------------------------------------------------

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

interface OperationDetailForMap {
  id: number;
  route_coordinates: [number, number][] | null;
}

export interface OrderCreateFormProps {
  // User info for pilot display & weight calc
  userFullName: string;
  userEmail: string;
  // Form values
  plannedStartDate: string;
  plannedStartTime: string;
  plannedEndDate: string;
  plannedEndTime: string;
  helicopterId: string;
  selectedCrewIds: number[];
  startSiteId: string;
  endSiteId: string;
  selectedOpIds: number[];
  estimatedRouteKm: string;
  // Data lists
  helicopters: HelicopterOption[];
  allCrew: CrewMemberOption[];
  landingSites: LandingSiteOption[];
  confirmedOps: OperationOption[];
  createModeOpDetails: OperationDetailForMap[];
  // Change handlers
  onPlannedStartDateChange: (v: string) => void;
  onPlannedStartTimeChange: (v: string) => void;
  onPlannedEndDateChange: (v: string) => void;
  onPlannedEndTimeChange: (v: string) => void;
  onHelicopterIdChange: (v: string) => void;
  onCrewToggle: (crewId: number) => void;
  onStartSiteIdChange: (v: string) => void;
  onEndSiteIdChange: (v: string) => void;
  onOpToggle: (opId: number) => void;
  onEstimatedRouteKmChange: (v: string) => void;
  // Actions
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  isCreating: boolean;
  // Field-level validation errors
  fieldErrors: Record<string, string>;
  // Optional override labels for edit mode
  submitLabel?: string;
  cancelLabel?: string;
}

export function OrderCreateForm({
  userFullName,
  userEmail,
  plannedStartDate,
  plannedStartTime,
  plannedEndDate,
  plannedEndTime,
  helicopterId,
  selectedCrewIds,
  startSiteId,
  endSiteId,
  selectedOpIds,
  estimatedRouteKm,
  helicopters,
  allCrew,
  landingSites,
  confirmedOps,
  createModeOpDetails,
  onPlannedStartDateChange,
  onPlannedStartTimeChange,
  onPlannedEndDateChange,
  onPlannedEndTimeChange,
  onHelicopterIdChange,
  onCrewToggle,
  onStartSiteIdChange,
  onEndSiteIdChange,
  onOpToggle,
  onEstimatedRouteKmChange,
  onSubmit,
  onCancel,
  isCreating,
  fieldErrors,
  submitLabel,
  cancelLabel,
}: OrderCreateFormProps) {
  const { t } = useTranslation();

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

  // ---- Live weight calculation ----
  const selectedCrewMembers = useMemo(
    () => allCrew.filter((c) => selectedCrewIds.includes(c.id)),
    [allCrew, selectedCrewIds]
  );

  const totalCrewWeight = useMemo(() => {
    const crewWeight = selectedCrewMembers.reduce((sum, c) => sum + c.weight, 0);
    // Include pilot weight from their crew-member profile (matched by email)
    const pilotMember = allCrew.find(
      (c) => c.role === CREW_ROLE.PILOT && c.email === userEmail
    );
    const pilotWeight = pilotMember?.weight ?? 0;
    return crewWeight + pilotWeight;
  }, [selectedCrewMembers, allCrew, userEmail]);

  // ---- Map preview data ----
  const createMapOps = createModeOpDetails
    .filter((op) => op.route_coordinates && op.route_coordinates.length > 0)
    .map((op) => ({ id: op.id, route_coordinates: op.route_coordinates! }));
  const createStartSite = landingSites.find((s) => s.id === Number(startSiteId));
  const createEndSite = landingSites.find((s) => s.id === Number(endSiteId));
  const hasMapData = createMapOps.length > 0 || createStartSite || createEndSite;

  function composeDT(date: string, time: string): string {
    if (!date) return "";
    return `${date}T${time || "00:00"}`;
  }
  const composedStart = composeDT(plannedStartDate, plannedStartTime);
  const composedEnd = composeDT(plannedEndDate, plannedEndTime);
  const dateError = !!(composedStart && composedEnd && new Date(composedEnd) <= new Date(composedStart));

  return (
    <div className="rounded-md bg-surface-container-low p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <FormLegend />
        {/* Pilot -- auto-filled, read-only */}
        <div className="space-y-2">
          <Label>{t('orders.pilotAutoFilled')}</Label>
          <Input value={userFullName} disabled className="bg-muted" />
        </div>

        {/* Planned dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plannedStartDate">{t('orders.plannedStartLabel')} *</Label>
            <div className="flex gap-2">
              <Input id="plannedStartDate" type="date" value={plannedStartDate} onChange={(e) => onPlannedStartDateChange(e.target.value)} required />
              <Input id="plannedStartTime" type="time" value={plannedStartTime} onChange={(e) => onPlannedStartTimeChange(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plannedEndDate">{t('orders.plannedEndLabel')} *</Label>
            <div className="flex gap-2">
              <Input id="plannedEndDate" type="date" value={plannedEndDate} onChange={(e) => onPlannedEndDateChange(e.target.value)} required />
              <Input id="plannedEndTime" type="time" value={plannedEndTime} onChange={(e) => onPlannedEndTimeChange(e.target.value)} required />
            </div>
          </div>
        </div>
        {dateError && (
          <p className="text-sm text-destructive-foreground">{t('orders.validationPlannedEndBeforeStart')}</p>
        )}
        {fieldErrors.plannedStart && (
          <p className="text-xs text-destructive">{fieldErrors.plannedStart}</p>
        )}
        {fieldErrors.plannedEnd && (
          <p className="text-xs text-destructive">{fieldErrors.plannedEnd}</p>
        )}

        {/* Helicopter dropdown */}
        <div className="space-y-2">
          <Label htmlFor="helicopter">{t('orders.helicopterLabel')} *</Label>
          {activeHelicopters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('orders.noActiveHelicopters')}
            </p>
          ) : (
            <Select
              id="helicopter"
              value={helicopterId}
              onChange={(e) => onHelicopterIdChange(e.target.value)}
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
          {fieldErrors.helicopter && (
            <p className="text-xs text-destructive">{fieldErrors.helicopter}</p>
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
              {[...allCrew]
                .sort((a, b) =>
                  `${a.first_name} ${a.last_name}`.localeCompare(
                    `${b.first_name} ${b.last_name}`
                  )
                )
                .map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCrewIds.includes(c.id)}
                      onChange={() => onCrewToggle(c.id)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startSite">{t('orders.startLandingSite')} *</Label>
            <Select
              id="startSite"
              value={startSiteId}
              onChange={(e) => onStartSiteIdChange(e.target.value)}
              required
            >
              <option value="">{t('orders.selectLandingSite')}</option>
              {landingSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {fieldErrors.startSite && (
              <p className="text-xs text-destructive">{fieldErrors.startSite}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endSite">{t('orders.endLandingSite')} *</Label>
            <Select
              id="endSite"
              value={endSiteId}
              onChange={(e) => onEndSiteIdChange(e.target.value)}
              required
            >
              <option value="">{t('orders.selectLandingSite')}</option>
              {landingSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {fieldErrors.endSite && (
              <p className="text-xs text-destructive">{fieldErrors.endSite}</p>
            )}
          </div>
        </div>

        {/* Operations multi-select */}
        <div className="space-y-2">
          <Label>{t('orders.operationsConfirmed')} *</Label>
          {confirmedOps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('orders.noConfirmedOperations')}
            </p>
          ) : (
            <div className="rounded-md border p-3 max-h-48 overflow-y-auto space-y-1">
              {[...confirmedOps]
                .sort((a, b) =>
                  (a.planned_date_earliest || '').localeCompare(
                    b.planned_date_earliest || ''
                  )
                )
                .map((op) => (
                  <label
                    key={op.id}
                    className="flex items-center gap-2 text-sm py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOpIds.includes(op.id)}
                      onChange={() => onOpToggle(op.id)}
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
          {fieldErrors.operations && (
            <p className="text-xs text-destructive">{fieldErrors.operations}</p>
          )}
        </div>

        {/* Estimated route km */}
        <div className="space-y-2">
          <Label htmlFor="routeKm">{t('orders.estimatedRouteKm')} *</Label>
          <Input
            id="routeKm"
            type="number"
            min={1}
            value={estimatedRouteKm}
            onChange={(e) => onEstimatedRouteKmChange(e.target.value)}
            required
          />
          {fieldErrors.routeKm && (
            <p className="text-xs text-destructive">{fieldErrors.routeKm}</p>
          )}
          {selectedHelicopter && estimatedRouteKm && Number(estimatedRouteKm) > selectedHelicopter.range_km && (
            <p className="text-sm text-destructive-foreground font-bold">
              {t('orders.routeExceeded', { route: estimatedRouteKm, range: selectedHelicopter.range_km })}
            </p>
          )}
        </div>

        {/* Create-mode map preview */}
        {hasMapData && (
          <div className="space-y-2">
            <Label>{t('orders.routeMap')}</Label>
            <div key={`${selectedOpIds.join(',')}-${startSiteId}-${endSiteId}`}>
              <OrderMap
                operations={createMapOps}
                startLandingSite={
                  createStartSite
                    ? { name: createStartSite.name, lat: createStartSite.latitude, lng: createStartSite.longitude }
                    : null
                }
                endLandingSite={
                  createEndSite
                    ? { name: createEndSite.name, lat: createEndSite.latitude, lng: createEndSite.longitude }
                    : null
                }
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isCreating || dateError}>
            {isCreating
              ? t('common.saving')
              : (submitLabel ?? t('orders.createOrder'))}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {cancelLabel ?? t('orders.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
