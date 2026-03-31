/**
 * OrderMap — combined map showing operation routes + start/end landing site markers.
 * Uses react-leaflet v4. CircleMarker avoids broken default icon issue.
 */
import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";

interface LandingSiteMarker {
  name: string;
  lat: number;
  lng: number;
}

interface OperationRoute {
  id: number;
  route_coordinates: [number, number][];
}

interface OrderMapProps {
  operations: OperationRoute[];
  startLandingSite?: LandingSiteMarker | null;
  endLandingSite?: LandingSiteMarker | null;
}

/** Auto-fit bounds to all visible features. */
function FitBounds({
  operations,
  startLandingSite,
  endLandingSite,
}: OrderMapProps) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;

    const allPoints: [number, number][] = [];

    for (const op of operations) {
      for (const coord of op.route_coordinates) {
        allPoints.push(coord);
      }
    }

    if (startLandingSite) {
      allPoints.push([startLandingSite.lat, startLandingSite.lng]);
    }
    if (endLandingSite) {
      allPoints.push([endLandingSite.lat, endLandingSite.lng]);
    }

    if (allPoints.length > 0) {
      const bounds: LatLngBoundsExpression = allPoints.map(
        (c) => [c[0], c[1]] as [number, number]
      );
      map.fitBounds(bounds, { padding: [30, 30] });
      fitted.current = true;
    }
  }, [operations, startLandingSite, endLandingSite, map]);

  return null;
}

export function OrderMap({
  operations,
  startLandingSite,
  endLandingSite,
}: OrderMapProps) {
  const { t } = useTranslation();
  // Determine default center
  let center: LatLngExpression = [51.9, 19.1]; // Poland center fallback
  if (startLandingSite) {
    center = [startLandingSite.lat, startLandingSite.lng];
  } else if (operations.length > 0 && operations[0]!.route_coordinates.length > 0) {
    const first = operations[0]!.route_coordinates[0]!;
    center = [first[0], first[1]];
  }

  return (
    <div className="h-[400px] w-full rounded-md border overflow-hidden">
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Operation route polylines */}
        {operations.map((op) =>
          op.route_coordinates.length > 0 ? (
            <Polyline
              key={op.id}
              positions={op.route_coordinates}
              pathOptions={{ color: "#2563eb", weight: 3 }}
            />
          ) : null
        )}

        {/* Start landing site — green */}
        {startLandingSite && (
          <CircleMarker
            center={[startLandingSite.lat, startLandingSite.lng]}
            radius={8}
            pathOptions={{
              color: "#16a34a",
              fillColor: "#22c55e",
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{t('orders.startLandingSite')}:</strong> {startLandingSite.name}
            </Popup>
          </CircleMarker>
        )}

        {/* End landing site — red */}
        {endLandingSite && (
          <CircleMarker
            center={[endLandingSite.lat, endLandingSite.lng]}
            radius={8}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#ef4444",
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{t('orders.endLandingSite')}:</strong> {endLandingSite.name}
            </Popup>
          </CircleMarker>
        )}

        <FitBounds
          operations={operations}
          startLandingSite={startLandingSite}
          endLandingSite={endLandingSite}
        />
      </MapContainer>
    </div>
  );
}
