/**
 * OperationMap — renders a flight route polyline on OpenStreetMap tiles.
 * Uses react-leaflet v4. Auto-fits bounds to the route extent.
 */
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface OperationMapProps {
  coordinates: [number, number][];
}

/** Inner component that auto-fits bounds whenever coordinates change. */
function FitBounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds: LatLngBoundsExpression = coordinates.map(
        (c) => [c[0], c[1]] as [number, number]
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [coordinates, map]);

  return null;
}

export function OperationMap({ coordinates }: OperationMapProps) {
  if (coordinates.length === 0) return null;

  // Default center from first coordinate
  const center: [number, number] = [coordinates[0]![0], coordinates[0]![1]];

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
        <Polyline
          positions={coordinates}
          pathOptions={{ color: "#2563eb", weight: 3 }}
        />
        <FitBounds coordinates={coordinates} />
      </MapContainer>
    </div>
  );
}
