/**
 * OrderDetailView -- read-only detail content for flight orders.
 *
 * Order details grid, actual times section (editable by Pilot in status=4),
 * crew members list, operations list with status badges, and map visualization.
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { OrderMap } from "@/components/maps/OrderMap";

// ---- Types ----------------------------------------------------------

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

interface MapOperation {
  id: number;
  route_coordinates: [number, number][];
}

interface MapLandingSite {
  name: string;
  lat: number;
  lng: number;
}

export interface OrderDetailViewProps {
  order: FlightOrderDetail;
  isPilot: boolean;
  currentStatus: number;
  // Actual times (editable in status=4 by pilot)
  actualStartDate: string;
  actualStartTime: string;
  actualEndDate: string;
  actualEndTime: string;
  onActualStartDateChange: (v: string) => void;
  onActualStartTimeChange: (v: string) => void;
  onActualEndDateChange: (v: string) => void;
  onActualEndTimeChange: (v: string) => void;
  onSaveActualTimes: () => void;
  savingActualTimes: boolean;
  // Map data
  mapOperations: MapOperation[];
  startSiteForMap: MapLandingSite | null;
  endSiteForMap: MapLandingSite | null;
}

export function OrderDetailView({
  order,
  isPilot,
  currentStatus,
  actualStartDate,
  actualStartTime,
  actualEndDate,
  actualEndTime,
  onActualStartDateChange,
  onActualStartTimeChange,
  onActualEndDateChange,
  onActualEndTimeChange,
  onSaveActualTimes,
  savingActualTimes,
  mapOperations,
  startSiteForMap,
  endSiteForMap,
}: OrderDetailViewProps) {
  const { t } = useTranslation();

  function composeDT(date: string, time: string): string {
    if (!date) return "";
    return `${date}T${time || "00:00"}`;
  }
  const composedActualStart = composeDT(actualStartDate, actualStartTime);
  const composedActualEnd = composeDT(actualEndDate, actualEndTime);
  const actualDateError = !!(composedActualStart && composedActualEnd && new Date(composedActualEnd) <= new Date(composedActualStart));

  return (
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
                {new Date(order.planned_start_datetime).toLocaleString("pl-PL")}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                {t('orders.plannedEndLabel')}
              </Label>
              <p className="text-sm font-medium">
                {new Date(order.planned_end_datetime).toLocaleString("pl-PL")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t('orders.helicopter')}</Label>
              <p className="text-sm font-medium">
                {order.helicopter_registration ?? "\u2014"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                {t('orders.estimatedRoute')}
              </Label>
              <p className="text-sm font-medium">
                {order.estimated_route_km != null
                  ? `${order.estimated_route_km} km`
                  : "\u2014"}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">{t('orders.crewWeightLabel')}</Label>
            <p className="text-sm font-medium">
              {order.crew_weight != null ? `${order.crew_weight} kg` : "\u2014"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">
                {t('orders.startLandingSiteLabel')}
              </Label>
              <p className="text-sm font-medium">
                {order.start_landing_site_name ?? "\u2014"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                {t('orders.endLandingSiteLabel')}
              </Label>
              <p className="text-sm font-medium">
                {order.end_landing_site_name ?? "\u2014"}
              </p>
            </div>
          </div>
        </div>

        {/* Actual datetimes -- editable by pilot when status=4 */}
        {isPilot && currentStatus === 4 && (
          <div className="rounded-md bg-surface-container-low p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {t('orders.actualTimes')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actualStartDate">{t('orders.actualStart')}</Label>
                <div className="flex gap-2">
                  <Input id="actualStartDate" type="date" value={actualStartDate} onChange={(e) => onActualStartDateChange(e.target.value)} />
                  <Input id="actualStartTime" type="time" value={actualStartTime} onChange={(e) => onActualStartTimeChange(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualEndDate">{t('orders.actualEnd')}</Label>
                <div className="flex gap-2">
                  <Input id="actualEndDate" type="date" value={actualEndDate} onChange={(e) => onActualEndDateChange(e.target.value)} />
                  <Input id="actualEndTime" type="time" value={actualEndTime} onChange={(e) => onActualEndTimeChange(e.target.value)} />
                </div>
              </div>
            </div>
            {actualDateError && (
              <p className="text-sm text-destructive-foreground">{t('orders.validationActualEndBeforeStart')}</p>
            )}
            <Button
              onClick={onSaveActualTimes}
              disabled={savingActualTimes || actualDateError}
            >
              {savingActualTimes
                ? t('orders.savingTimes')
                : t('orders.saveTimes')}
            </Button>
          </div>
        )}

        {/* Read-only actual datetimes when not editable */}
        {(!isPilot || currentStatus !== 4) &&
          (order.actual_start_datetime || order.actual_end_datetime) && (
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
                      : "\u2014"}
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
                      : "\u2014"}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Crew members list */}
        <div className="rounded-md bg-surface-container-low p-6">
          <h2 className="text-lg font-semibold mb-3">{t('orders.crewSection')}</h2>
          {order.crew_members.length > 0 ? (
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
          {order.operations.length > 0 ? (
            <ul className="space-y-1">
              {order.operations.map((op) => (
                <li key={op.id} className="text-sm">
                  #{op.id} — {op.short_description ?? t('orders.noDescription')}{" "}
                  <Badge variant="outline" className="ml-1 text-xs">
                    {t(`operations.status${op.status}`, { defaultValue: `Status ${op.status}` })}
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
              startLandingSite={startSiteForMap}
              endLandingSite={endSiteForMap}
            />
          </div>
        )}
      </div>
    </div>
  );
}
