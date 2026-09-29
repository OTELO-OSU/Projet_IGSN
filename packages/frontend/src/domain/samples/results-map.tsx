import "leaflet/dist/leaflet.css";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { SampleMapCluster } from "@projet-igsn/domain/sample/map/model";
import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import { Link } from "@tanstack/react-router";
import L from "leaflet";
import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Polyline,
  Popup,
  Rectangle,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";

import { useListSamples } from "#/domain/samples/hook/list-samples.ts";
import { materialPathLabel } from "#/domain/samples/sample-labels.ts";
import {
  OsmTileLayer,
  WORLD_BOUNDS,
  areaHalves,
  formatBbox,
  singleBoundsOrWorld,
  toBoundsList,
} from "#/domain/samples/search-location-map.tsx";
import { SplitMarker, splitOrigin } from "#/domain/samples/split-marker.tsx";
import { m } from "#/paraglide/messages.js";

export type MapViewport = { bbox: string; zoom: number };
type Position = NonNullable<Location["position"]>;
export type HoveredSample = { igsn: string; position: Position };

const MAX_ZOOM = 18;
const CLUSTER_PAGE_SIZE = 10;
const CLUSTER_PAD_DEGREES = 1e-4;
const MOVE_DEBOUNCE_MS = 500;
const MIN_SHAPE_PX = 24;
const SHAPE_STYLE = { color: "#075985", weight: 2, fillOpacity: 0.15 };
const HIGHLIGHTED_SHAPE_STYLE = {
  color: "#f59e0b",
  weight: 3,
  fillOpacity: 0.25,
};

const MARKER_CLASS = "rounded-full border-2 border-white shadow";
const HIGHLIGHT_CLASS = "bg-amber-500 ring-4 ring-amber-300";
const SAMPLE_ICON = L.divIcon({
  className: `${MARKER_CLASS} bg-sky-800`,
  iconSize: [16, 16],
});
const HIGHLIGHTED_ICON = L.divIcon({
  className: `${MARKER_CLASS} ${HIGHLIGHT_CLASS}`,
  iconSize: [22, 22],
});

const clusterIcons = new Map<string, L.DivIcon>();
function clusterIcon(count: number, isHighlighted: boolean): L.DivIcon {
  const key = `${count}:${isHighlighted}`;
  let icon = clusterIcons.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: `${MARKER_CLASS} text-xs font-semibold text-white ${isHighlighted ? HIGHLIGHT_CLASS : "bg-sky-900"}`,
      html: `<span aria-hidden="true" class="flex size-full items-center justify-center">${count}</span>`,
      iconSize: [32, 32],
    });
    clusterIcons.set(key, icon);
  }
  return icon;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// ponytail: a dateline-crossing area is not clipped, and a line takes its midpoint unclipped.
function highlightPoint(
  position: Position,
  bounds: L.LatLngBounds,
): L.LatLngTuple {
  if (position.type === "point") return [position.latitude, position.longitude];
  if (position.type === "line") {
    return [
      (position.startLatitude + position.endLatitude) / 2,
      (position.startLongitude + position.endLongitude) / 2,
    ];
  }
  const south = clamp(
    position.southLatitude,
    bounds.getSouth(),
    bounds.getNorth(),
  );
  const north = clamp(
    position.northLatitude,
    bounds.getSouth(),
    bounds.getNorth(),
  );
  if (position.westLongitude > position.eastLongitude) {
    return [(south + north) / 2, position.westLongitude];
  }
  const west = clamp(
    position.westLongitude,
    bounds.getWest(),
    bounds.getEast(),
  );
  const east = clamp(
    position.eastLongitude,
    bounds.getWest(),
    bounds.getEast(),
  );
  return [(south + north) / 2, (west + east) / 2];
}

function highlightedClusterIndex(
  clusters: SampleMapCluster[],
  highlighted: HoveredSample,
  bounds: L.LatLngBounds,
): number {
  if (clusters.some((cluster) => cluster.sample?.igsn === highlighted.igsn)) {
    return -1;
  }
  const point = L.latLng(highlightPoint(highlighted.position, bounds));
  return clusters.findIndex(
    ({ sample, extent }) =>
      !sample && extentBounds(extent).pad(0.01).contains(point),
  );
}

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

const extentBounds = ({ west, south, east, north }: Bbox) =>
  L.latLngBounds([south, west], [north, east]);

const viewportOf = (map: L.Map): MapViewport => {
  const bounds = map.getBounds();
  return {
    bbox: formatBbox(bounds.getSouthWest(), bounds.getNorthEast()),
    zoom: map.getZoom(),
  };
};

const openingBounds = (fitTo: Bbox | null): L.LatLngBoundsExpression =>
  singleBoundsOrWorld(fitTo ? toBoundsList(fitTo) : []);

const clusterBbox = ({ west, south, east, north }: Bbox) =>
  formatBbox(
    L.latLng(south - CLUSTER_PAD_DEGREES, west - CLUSTER_PAD_DEGREES),
    L.latLng(north + CLUSTER_PAD_DEGREES, east + CLUSTER_PAD_DEGREES),
  );

function SamplePopup({
  sample,
}: {
  sample: NonNullable<SampleMapCluster["sample"]>;
}) {
  return (
    <Popup>
      <p className="font-mono text-xs break-all">{sample.igsn}</p>
      <p className="font-semibold">{sample.name}</p>
      {sample.material ? <p>{materialPathLabel(sample.material)}</p> : null}
      <Link to="/samples/$igsn" params={{ igsn: sample.igsn }}>
        {m.results_map_view_sample()}
      </Link>
    </Popup>
  );
}

function ClusterSamples({
  filters,
  extent,
}: {
  filters: SearchFilters;
  extent: Bbox;
}) {
  const { data } = useListSamples({
    ...filters,
    bbox: clusterBbox(extent),
    page: 1,
    perPage: CLUSTER_PAGE_SIZE,
  });
  const rest = data.total - data.data.length;
  return (
    <>
      <ul>
        {data.data.map(({ igsn, name }) =>
          igsn ? (
            <li key={igsn}>
              <Link to="/samples/$igsn" params={{ igsn }}>
                {name}
              </Link>
            </li>
          ) : null,
        )}
      </ul>
      {rest > 0 ? <p>{m.results_map_more({ count: rest })}</p> : null}
    </>
  );
}

function Clusters({
  clusters,
  highlighted,
  filters,
  onViewportChange,
  onUserMove,
}: {
  clusters: SampleMapCluster[];
  highlighted?: HoveredSample;
  filters: SearchFilters;
  onViewportChange: (viewport: MapViewport) => void;
  onUserMove: (bbox: string) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const [shown, setShown] = useState({
    clusters,
    previous: [] as SampleMapCluster[],
  });
  if (shown.clusters !== clusters) {
    setShown({ clusters, previous: shown.clusters });
  }
  const previous =
    shown.clusters === clusters ? shown.previous : shown.clusters;
  const moveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(moveTimer.current), []);
  useMapEvents({
    moveend() {
      setZoom(map.getZoom());
      clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(() => {
        const viewport = viewportOf(map);
        onViewportChange(viewport);
        onUserMove(viewport.bbox);
      }, MOVE_DEBOUNCE_MS);
    },
  });
  useEffect(() => onViewportChange(viewportOf(map)), [map]);
  const atMaxZoom = zoom >= map.getMaxZoom();
  const highlightedCluster = highlighted
    ? highlightedClusterIndex(clusters, highlighted, map.getBounds())
    : -1;

  return (
    <>
      {clusters.map((cluster, index) => {
        const { longitude, latitude, count, extent, sample } = cluster;
        const splitFrom = () => splitOrigin(previous, cluster);
        if (sample) {
          const isHighlighted = sample.igsn === highlighted?.igsn;
          return (
            <Fragment key={sample.igsn}>
              {sample.position ? (
                <SampleOutline
                  position={sample.position}
                  isHighlighted={isHighlighted}
                />
              ) : null}
              <SplitMarker
                from={splitFrom}
                position={[latitude, longitude]}
                title={sample.name}
                icon={isHighlighted ? HIGHLIGHTED_ICON : SAMPLE_ICON}
                zIndexOffset={isHighlighted ? 1000 : 0}
              >
                <SamplePopup sample={sample} />
              </SplitMarker>
            </Fragment>
          );
        }
        const isHighlighted = index === highlightedCluster;
        return (
          <SplitMarker
            key={`${longitude},${latitude}`}
            from={splitFrom}
            position={[latitude, longitude]}
            title={m.results_map_cluster({ count })}
            icon={clusterIcon(count, isHighlighted)}
            zIndexOffset={isHighlighted ? 1000 : 0}
            eventHandlers={
              atMaxZoom
                ? undefined
                : { click: () => map.fitBounds(extentBounds(extent)) }
            }
          >
            {atMaxZoom ? (
              <Popup>
                <Suspense fallback={null}>
                  <ClusterSamples filters={filters} extent={extent} />
                </Suspense>
              </Popup>
            ) : null}
          </SplitMarker>
        );
      })}
    </>
  );
}

export function ResultsMap({
  fitTo,
  ...layers
}: {
  clusters: SampleMapCluster[];
  fitTo: Bbox | null;
  highlighted?: HoveredSample;
  filters: SearchFilters;
  onViewportChange: (viewport: MapViewport) => void;
  onUserMove: (bbox: string) => void;
}) {
  return (
    <MapContainer
      bounds={openingBounds(fitTo)}
      minZoom={1}
      maxZoom={MAX_ZOOM}
      maxBounds={WORLD_BOUNDS}
      maxBoundsViscosity={1}
      className="z-0 h-full w-full rounded-md"
    >
      <OsmTileLayer />
      <Clusters {...layers} />
    </MapContainer>
  );
}
