import "leaflet/dist/leaflet.css";
import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { splitBbox } from "@projet-igsn/domain/sample/split-bbox";
import { type LatLng, type LatLngBoundsExpression, Util } from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

const WORLD_BOUNDS: LatLngBoundsExpression = [
  [-90, -180],
  [90, 180],
];

const MIN_DRAG_PX = 5;

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;
const clampLatitude = (value: number) =>
  round6(Math.max(-90, Math.min(90, value)));

const wrapLongitude = (value: number) =>
  round6(Util.wrapNum(value, [-180, 180], true));

export function formatBbox(a: LatLng, b: LatLng): string {
  const lats = [clampLatitude(a.lat), clampLatitude(b.lat)];
  const start = Math.min(a.lng, b.lng);
  const stop = Math.max(a.lng, b.lng);
  const spansWholeWorld = stop - start >= 360;
  const west = spansWholeWorld ? -180 : wrapLongitude(start);
  const east = spansWholeWorld ? 180 : wrapLongitude(stop);
  return `${west},${Math.min(...lats)},${east},${Math.max(...lats)}`;
}

function toBoundsList(bbox: string | undefined): LatLngBoundsExpression[] {
  const parsed = bboxSchema.safeParse(bbox);
  if (!parsed.success) return [];
  return splitBbox(parsed.data).map(
    ({ west, south, east, north }): LatLngBoundsExpression => [
      [south, west],
      [north, east],
    ],
  );
}

export function RectangleDrawer({
  bbox,
  drawing,
  onSelect,
}: {
  bbox: string | undefined;
  drawing: boolean;
  onSelect: (bbox: string) => void;
}) {
  const startRef = useRef<{ latlng: LatLng; drag: boolean } | null>(null);
  const [draft, setDraft] = useState<LatLngBoundsExpression | null>(null);
  const map = useMapEvents({
    mousedown(event) {
      if (!event.originalEvent.shiftKey) return;
      begin(event.latlng, true);
      map.dragging.disable();
    },
    mousemove(event) {
      const start = startRef.current;
      if (!start) return;
      setDraft([
        [start.latlng.lat, start.latlng.lng],
        [event.latlng.lat, event.latlng.lng],
      ]);
    },
    mouseup(event) {
      if (startRef.current?.drag) end(event.latlng);
    },
    click(event) {
      if (!drawing) return;
      if (startRef.current) end(event.latlng);
      else begin(event.latlng, false);
    },
  });

  function begin(latlng: LatLng, drag: boolean) {
    startRef.current = { latlng, drag };
    const corner = [latlng.lat, latlng.lng] as [number, number];
    setDraft([corner, corner]);
  }

  function end(corner: LatLng) {
    const start = startRef.current;
    if (!start) return;
    startRef.current = null;
    setDraft(null);
    map.dragging.enable();
    const from = map.latLngToContainerPoint(start.latlng);
    const to = map.latLngToContainerPoint(corner);
    if (from.distanceTo(to) < MIN_DRAG_PX) return;
    onSelect(formatBbox(start.latlng, corner));
  }

  useEffect(() => {
    function onDocumentMouseUp(event: MouseEvent) {
      if (startRef.current?.drag) end(map.mouseEventToLatLng(event));
    }
    document.addEventListener("mouseup", onDocumentMouseUp);
    return () => document.removeEventListener("mouseup", onDocumentMouseUp);
  });

  useEffect(() => {
    if (drawing || startRef.current?.drag) return;
    startRef.current = null;
    setDraft(null);
  }, [drawing]);

  const [westHalf, eastHalf] = draft ? [draft] : toBoundsList(bbox);
  return (
    <>
      {westHalf ? <Rectangle bounds={westHalf} /> : null}
      {eastHalf ? <Rectangle bounds={eastHalf} /> : null}
    </>
  );
}

export function DrawCursor({ drawing }: { drawing: boolean }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle("leaflet-crosshair", drawing);
    return () => container.classList.remove("leaflet-crosshair");
  }, [drawing, map]);
  return null;
}

export function InvalidateOnResize({ compact }: { compact: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [compact, map]);
  return null;
}

export function FitSelection({ bbox }: { bbox: string | undefined }) {
  const map = useMap();
  useEffect(() => {
    const [bounds, ...rest] = toBoundsList(bbox);
    if (bounds) map.fitBounds(rest.length > 0 ? WORLD_BOUNDS : bounds);
  }, [bbox, map]);
  return null;
}

// ponytail: both paths (Shift+drag, two clicks) are mouse-only, no keyboard path
// to a bbox (WCAG 2.1.1 gap). Accepted per product decision; add a keyboard
// entry path if needed.
export function SearchLocationMap({
  value,
  drawing,
  onChange,
  compact = false,
}: {
  value?: string;
  drawing: boolean;
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
      className="z-0 h-full w-full rounded-md select-none"
    >
      {/* ponytail: OSM public tiles are a known ceiling, self-host if traffic
          grows. The attribution is required by their usage policy. */}
      <TileLayer
        noWrap
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RectangleDrawer bbox={value} drawing={drawing} onSelect={onChange} />
      <DrawCursor drawing={drawing} />
      <InvalidateOnResize compact={compact} />
      {compact ? <FitSelection bbox={value} /> : null}
    </MapContainer>
  );
}
