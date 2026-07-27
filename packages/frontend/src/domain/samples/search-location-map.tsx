import "leaflet/dist/leaflet.css";
import { Button } from "@projet-igsn/design-system/components/ui/button";
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

// One rectangle drawn with Shift+mousedown->drag->mouseup (no draw plugin). A
// plain drag falls through and pans the map. The live draft takes precedence
// over the saved box, so only ever one rectangle shows and a new drag replaces
// the previous one.
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
    onSelect(formatBbox(start, corner));
  }

  // End the drag on a release ANYWHERE. Leaflet's map mouseup fires only over
  // the map surface, so releasing over a control (zoom +/-, attribution) or off
  // the map never fires it: the drag stays stuck and the box tracks the cursor
  // forever. A document listener catches the release wherever it lands.
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

// Recenters the map on the saved box, used by the shrunk (compact) banner.
function FitSelection({ bbox }: { bbox: string | undefined }) {
  const map = useMap();
  useEffect(() => {
    const bounds = toBounds(bbox);
    if (bounds) map.fitBounds(bounds);
  }, [bbox, map]);
  return null;
}

// Leaflet world map: Shift+drag a rectangle, then run a location search.
// `compact` shrinks the map and recenters it on the selection (post-search).
// This module is imported client-side only (leaflet touches `window`), so no
// in-component SSR gate is needed.
// ponytail: drawing is Shift+drag mouse-only, no keyboard path to a bbox
// (WCAG 2.1.1 gap). Accepted per product decision; add a keyboard entry path if
// keyboard users need it.
export function SearchLocationMap({
  onSearch,
  initialBbox,
  compact = false,
}: {
  onSearch: (bbox: string) => void;
  initialBbox?: string;
  compact?: boolean;
}) {
  // Selection is the single "w,s,e,n" source of truth, fed by the drawer's
  // onSelect, and gates the Search button via bboxSchema.
  const [selection, setSelection] = useState(initialBbox ?? "");
  const valid = bboxSchema.safeParse(selection).success;

  return (
    <div>
      <p id={HINT_ID} className="mb-2 text-sky-100">
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
          boxZoom={false}
          className={`${compact ? "h-48" : "h-80"} w-full rounded-md select-none`}
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
