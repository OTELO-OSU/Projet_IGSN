import "leaflet/dist/leaflet.css";
import { type LatLng, type LatLngBoundsExpression } from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

// Leaflet's lat/lng are unbounded (lng 220 on a wrapped world), which the domain
// schema rejects.
const WORLD_BOUNDS: LatLngBoundsExpression = [
  [-90, -180],
  [90, 180],
];

// A click with no drag would still produce a schema-valid zero-area box.
const MIN_DRAG_PX = 5;

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;
const clamp = (value: number, limit: number) =>
  round6(Math.max(-limit, Math.min(limit, value)));

export function formatBbox(a: LatLng, b: LatLng): string {
  const lngs = [clamp(a.lng, 180), clamp(b.lng, 180)];
  const lats = [clamp(a.lat, 90), clamp(b.lat, 90)];
  return `${Math.min(...lngs)},${Math.min(...lats)},${Math.max(...lngs)},${Math.max(...lats)}`;
}

function toBounds(bbox: string | undefined): LatLngBoundsExpression | null {
  if (!bbox) return null;
  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  const [west, south, east, north] = parts as [number, number, number, number];
  return [
    [south, west],
    [north, east],
  ];
}

export function RectangleDrawer({
  bbox,
  onSelect,
}: {
  bbox: string | undefined;
  onSelect: (bbox: string) => void;
}) {
  const startRef = useRef<LatLng | null>(null);
  const [draft, setDraft] = useState<LatLngBoundsExpression | null>(null);
  const map = useMapEvents({
    mousedown(event) {
      if (!event.originalEvent.shiftKey) return;
      startRef.current = event.latlng;
      const corner = [event.latlng.lat, event.latlng.lng] as [number, number];
      setDraft([corner, corner]);
      map.dragging.disable();
    },
    mousemove(event) {
      const start = startRef.current;
      if (!start) return;
      setDraft([
        [start.lat, start.lng],
        [event.latlng.lat, event.latlng.lng],
      ]);
    },
    mouseup(event) {
      end(event.latlng);
    },
  });

  function end(corner: LatLng) {
    const start = startRef.current;
    if (!start) return;
    startRef.current = null;
    setDraft(null);
    map.dragging.enable();
    const from = map.latLngToContainerPoint(start);
    const to = map.latLngToContainerPoint(corner);
    if (from.distanceTo(to) < MIN_DRAG_PX) return;
    onSelect(formatBbox(start, corner));
  }

  // Leaflet's mouseup fires only over the map surface, so a release anywhere
  // else would leave the box stuck to the cursor.
  useEffect(() => {
    function onDocumentMouseUp(event: MouseEvent) {
      if (startRef.current) end(map.mouseEventToLatLng(event));
    }
    document.addEventListener("mouseup", onDocumentMouseUp);
    return () => document.removeEventListener("mouseup", onDocumentMouseUp);
  });

  const bounds = draft ?? toBounds(bbox);
  return bounds ? <Rectangle bounds={bounds} /> : null;
}

export function InvalidateOnResize({ compact }: { compact: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [compact, map]);
  return null;
}

function FitSelection({ bbox }: { bbox: string | undefined }) {
  const map = useMap();
  useEffect(() => {
    const bounds = toBounds(bbox);
    if (bounds) map.fitBounds(bounds);
  }, [bbox, map]);
  return null;
}

// ponytail: Shift+drag is mouse-only, no keyboard path to a bbox (WCAG 2.1.1
// gap). Accepted per product decision; add a keyboard entry path if needed.
export function SearchLocationMap({
  value,
  onChange,
  compact = false,
}: {
  value?: string;
  onChange: (bbox: string) => void;
  compact?: boolean;
}) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      boxZoom={false}
      maxBounds={WORLD_BOUNDS}
      maxBoundsViscosity={1}
      className="h-full w-full rounded-md select-none"
    >
      {/* ponytail: OSM public tiles are a known ceiling, self-host if traffic
          grows. The attribution is required by their usage policy. */}
      <TileLayer
        noWrap
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RectangleDrawer bbox={value} onSelect={onChange} />
      <InvalidateOnResize compact={compact} />
      {compact ? <FitSelection bbox={value} /> : null}
    </MapContainer>
  );
}
