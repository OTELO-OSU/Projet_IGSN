import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { SampleMapDetail } from "@projet-igsn/domain/sample/map/model";

import L from "leaflet";
import { Polyline, Rectangle, Tooltip, useMap } from "react-leaflet";

import type { HoveredSample } from "#/domain/samples/map-highlight.ts";

import { areaHalves } from "#/domain/samples/search-location-map.tsx";
import { SplitMarker } from "#/domain/samples/split-marker.tsx";
import { m } from "#/paraglide/messages.js";

type Position = NonNullable<Location["position"]>;

export const MARKER_CLASS = "rounded-full border-2 border-white shadow";
export const HIGHLIGHT_CLASS = "bg-tertiary ring-4 ring-tertiary/60";

const MIN_SHAPE_PX = 24;
const SHAPE_STYLE = { color: "#013a68", weight: 2, fillOpacity: 0.15 };
const HIGHLIGHTED_SHAPE_STYLE = {
  color: "#c05f39",
  weight: 3,
  fillOpacity: 0.25,
};

const SAMPLE_ICON = L.divIcon({
  className: `${MARKER_CLASS} bg-primary`,
  iconSize: [16, 16],
});
const HIGHLIGHTED_ICON = L.divIcon({
  className: `${MARKER_CLASS} ${HIGHLIGHT_CLASS}`,
  iconSize: [22, 22],
});

const lineEnds = (
  line: Extract<Position, { type: "line" }>,
): [L.LatLngTuple, L.LatLngTuple] => [
  [line.startLatitude, line.startLongitude],
  [line.endLatitude, line.endLongitude],
];

function outlineSizePx(map: L.Map, position: Position): number {
  const spans =
    position.type === "line"
      ? [lineEnds(position)]
      : position.type === "area"
        ? (areaHalves(position) as [L.LatLngTuple, L.LatLngTuple][])
        : [];
  return Math.max(
    0,
    ...spans.map(([from, to]) => {
      const a = map.latLngToContainerPoint(from);
      const b = map.latLngToContainerPoint(to);
      return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    }),
  );
}

function SampleOutline({
  position,
  isHighlighted,
}: {
  position: Position;
  isHighlighted: boolean;
}) {
  const map = useMap();
  if (outlineSizePx(map, position) < MIN_SHAPE_PX) return null;
  const pathOptions = isHighlighted ? HIGHLIGHTED_SHAPE_STYLE : SHAPE_STYLE;
  if (position.type === "line") {
    return (
      <Polyline
        positions={lineEnds(position)}
        pathOptions={pathOptions}
        interactive={false}
      />
    );
  }
  if (position.type !== "area") return null;
  return areaHalves(position).map((bounds) => (
    <Rectangle
      key={JSON.stringify(bounds)}
      bounds={bounds}
      pathOptions={pathOptions}
      interactive={false}
    />
  ));
}

export function SampleMarker({
  longitude,
  latitude,
  sample,
  isHighlighted,
  from,
  onSelect,
}: {
  longitude: number;
  latitude: number;
  sample?: SampleMapDetail;
  isHighlighted: boolean;
  from: () => L.LatLngTuple | undefined;
  onSelect: (sample: HoveredSample) => void;
}) {
  const select = () => {
    if (!sample) return;
    onSelect({
      igsn: sample.igsn,
      position: sample.position ?? { type: "point", latitude, longitude },
    });
  };
  return (
    <>
      {sample?.position ? (
        <SampleOutline
          position={sample.position}
          isHighlighted={isHighlighted}
        />
      ) : null}
      <SplitMarker
        from={from}
        position={[latitude, longitude]}
        label={sample?.name ?? m.results_map_sample()}
        icon={isHighlighted ? HIGHLIGHTED_ICON : SAMPLE_ICON}
        zIndexOffset={isHighlighted ? 1000 : 0}
        eventHandlers={{
          click: select,
          keypress: ({ originalEvent }) => {
            if (originalEvent.key === "Enter") select();
          },
        }}
      >
        <Tooltip>
          <p className="text-base font-semibold">
            {sample?.name ?? m.results_map_sample()}
          </p>
          {sample ? (
            <p className="text-muted-foreground font-mono text-xs">
              {sample.igsn}
            </p>
          ) : null}
        </Tooltip>
      </SplitMarker>
    </>
  );
}
