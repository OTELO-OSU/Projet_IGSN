import "leaflet/dist/leaflet.css";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { type LatLng, type LatLngBoundsExpression } from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { m } from "#/paraglide/messages.js";

const HINT_ID = "search-map-hint";

// bbox order is "west,south,east,north"; reuse the sample location field labels
// (no new i18n keys) so the manual inputs read as the coordinates they are.
// Native min/max just give free browser validation/spinners; the Search enable
// gate stays with bboxSchema.
const BBOX_FIELDS = [
  { label: m.sample_field_west_longitude, min: -180, max: 180 },
  { label: m.sample_field_south_latitude, min: -90, max: 90 },
  { label: m.sample_field_east_longitude, min: -180, max: 180 },
  { label: m.sample_field_north_latitude, min: -90, max: 90 },
];

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

// Two dragged corners -> "west,south,east,north". min/max keeps west <= east
// (v1 constraint: no antimeridian crossing), matching the domain schema.
export function formatBbox(a: LatLng, b: LatLng): string {
  const west = round6(Math.min(a.lng, b.lng));
  const east = round6(Math.max(a.lng, b.lng));
  const south = round6(Math.min(a.lat, b.lat));
  const north = round6(Math.max(a.lat, b.lat));
  return `${west},${south},${east},${north}`;
}

// "w,s,e,n" -> Leaflet bounds for rendering, or null when absent/malformed.
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

// One rectangle drawn with a plain mousedown->drag->mouseup (no draw plugin).
// The live draft takes precedence over the saved box, so only ever one
// rectangle shows and a new drag replaces the previous one.
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
      startRef.current = event.latlng;
      const corner = [event.latlng.lat, event.latlng.lng] as [number, number];
      setDraft([corner, corner]);
      map.dragging.disable();
    },
    mousemove(event) {
      const start = startRef.current;
      if (start) {
        setDraft([
          [start.lat, start.lng],
          [event.latlng.lat, event.latlng.lng],
        ]);
      }
    },
    mouseup(event) {
      map.dragging.enable();
      if (!startRef.current) return;
      onSelect(formatBbox(startRef.current, event.latlng));
      startRef.current = null;
      setDraft(null);
    },
  });

  const bounds = draft ?? toBounds(bbox);
  return bounds ? <Rectangle bounds={bounds} /> : null;
}

// Recenters the map on the saved box, used by the shrunk (compact) banner.
function FitSelection({ bbox }: { bbox: string | undefined }) {
  const map = useMap();
  useEffect(() => {
    const bounds = toBounds(bbox);
    if (bounds) map.fitBounds(bounds);
  }, [bbox, map]);
  return null;
}

// Leaflet world map: draw a rectangle or type the bounds, then run a location
// search. `compact` shrinks the map and recenters it on the selection
// (post-search). This module is imported client-side only (leaflet touches
// `window`), so no in-component SSR gate is needed.
export function SearchLocationMap({
  onSearch,
  initialBbox,
  compact = false,
}: {
  onSearch: (bbox: string) => void;
  initialBbox?: string;
  compact?: boolean;
}) {
  // Selection is the single "w,s,e,n" source of truth for both the drawn
  // rectangle and the numeric inputs, so a mouse draw and a keyboard entry are
  // interchangeable and produce the same navigate payload.
  const [selection, setSelection] = useState(initialBbox ?? "");
  const parts = [0, 1, 2, 3].map((i) => selection.split(",")[i] ?? "");
  const setPart = (index: number, value: string) =>
    setSelection(parts.map((p, i) => (i === index ? value : p)).join(","));
  const valid = bboxSchema.safeParse(selection).success;

  return (
    <div>
      <p id={HINT_ID} className="text-muted-foreground mb-2">
        {m.search_map_hint()}
      </p>
      {/* react-leaflet's MapContainer does not forward role/aria-*, so name the
          region on a wrapper and link the hint to it. */}
      <div
        role="group"
        aria-label={m.search_map_label()}
        aria-describedby={HINT_ID}
      >
        <MapContainer
          center={[20, 0]}
          zoom={2}
          className={
            compact ? "h-48 w-full rounded-md" : "h-80 w-full rounded-md"
          }
        >
          {/* ponytail: OSM public tiles are a known ceiling (self-host/provider
              if traffic grows). Attribution is required by the OSM usage policy. */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RectangleDrawer bbox={selection} onSelect={setSelection} />
          {compact ? <FitSelection bbox={selection} /> : null}
        </MapContainer>
      </div>

      {/* Keyboard/SR path to the same bbox state (WCAG 2.1.1). */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BBOX_FIELDS.map(({ label, min, max }, index) => (
          <label key={label()} className="text-sm">
            <span>{label()}</span>
            <Input
              type="number"
              min={min}
              max={max}
              step="any"
              value={parts[index]}
              onChange={(event) => setPart(index, event.target.value)}
            />
          </label>
        ))}
      </div>

      <Button
        className="mt-2"
        disabled={!valid}
        onClick={() => onSearch(selection)}
      >
        {m.search_action()}
      </Button>
    </div>
  );
}
