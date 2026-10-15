import "leaflet/dist/leaflet.css";
import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { SampleMapDetail } from "@projet-igsn/domain/sample/map/model";
import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import { Link } from "@tanstack/react-router";
import L from "leaflet";
import { Suspense, useEffect, useRef, useState } from "react";
import { MapContainer, Popup, useMap, useMapEvents } from "react-leaflet";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";
import type {
  MapCluster,
  MapPoints,
} from "#/domain/samples/map-cluster-index.ts";

import { useListSamples } from "#/domain/samples/hook/list-samples.ts";
import { useMapSampleDetails } from "#/domain/samples/hook/map-sample-details.ts";
import {
  MAP_OVERLAY_CLASS,
  MapProgress,
} from "#/domain/samples/map-progress.tsx";
import {
  HIGHLIGHT_CLASS,
  MARKER_CLASS,
  SampleMarker,
} from "#/domain/samples/map-sample-marker.tsx";
import {
  OsmTileLayer,
  WORLD_BOUNDS,
  formatBbox,
  singleBoundsOrWorld,
  toBoundsList,
} from "#/domain/samples/search-location-map.tsx";
import { SplitMarker, splitOrigin } from "#/domain/samples/split-marker.tsx";
import { useMapClusters } from "#/domain/samples/use-map-clusters.ts";
import { m } from "#/paraglide/messages.js";
import { prefersReducedMotion } from "#/prefers-reduced-motion.ts";

export type MapViewport = { bbox: string; zoom: number };
type Position = NonNullable<Location["position"]>;
export type HoveredSample = { igsn: string; position: Position };
type ShownCluster = MapCluster & { sample?: SampleMapDetail };

const MAX_ZOOM = 18;
const MIN_BUBBLE_PX = 24;
const MAX_BUBBLE_PX = 64;
const BUBBLE_PX_PER_DIGIT = 8;
const CLUSTER_PAGE_SIZE = 10;
const CLUSTER_PAD_DEGREES = 1e-4;

const clusterIcons = new Map<string, L.DivIcon>();
function clusterIcon(
  count: number,
  isHighlighted: boolean,
  sizePx: number,
): L.DivIcon {
  const key = `${count}:${isHighlighted}:${sizePx}`;
  let icon = clusterIcons.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: `${MARKER_CLASS} text-xs font-semibold text-white ${isHighlighted ? HIGHLIGHT_CLASS : "bg-primary"}`,
      html: `<span aria-hidden="true" class="flex size-full items-center justify-center">${count}</span>`,
      iconSize: [sizePx, sizePx],
    });
    clusterIcons.set(key, icon);
  }
  return icon;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const bubbleSizePx = (count: number, maxCount: number) =>
  Math.round(
    clamp(
      MAX_BUBBLE_PX * Math.sqrt(count / maxCount),
      Math.max(MIN_BUBBLE_PX, BUBBLE_PX_PER_DIGIT * (String(count).length + 1)),
      MAX_BUBBLE_PX,
    ),
  );

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
  clusters: ShownCluster[],
  highlighted: HoveredSample,
  bounds: L.LatLngBounds,
): number {
  if (clusters.some((cluster) => cluster.sample?.igsn === highlighted.igsn)) {
    return -1;
  }
  const point = L.latLng(highlightPoint(highlighted.position, bounds));
  return clusters.findIndex(
    ({ count, extent }) =>
      count > 1 && extentBounds(extent).pad(0.01).contains(point),
  );
}

const extentBounds = ({ west, south, east, north }: Bbox) =>
  L.latLngBounds([south, west], [north, east]);

const boundsOf = (map: L.Map): Bbox => {
  const bounds = map.getBounds();
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  };
};

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
  const rest = (data.total ?? 0) - data.data.length;
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
  zoom,
  highlighted,
  filters,
  onSelectSample,
}: {
  clusters: ShownCluster[];
  zoom: number;
  highlighted?: HoveredSample;
  filters: SearchFilters;
  onSelectSample: (sample?: HoveredSample) => void;
}) {
  const map = useMap();
  const [shown, setShown] = useState({
    clusters,
    previous: [] as ShownCluster[],
  });
  if (shown.clusters !== clusters) {
    setShown({ clusters, previous: shown.clusters });
  }
  const previous =
    shown.clusters === clusters ? shown.previous : shown.clusters;
  const atMaxZoom = zoom >= map.getMaxZoom();
  const maxCount = Math.max(
    ...clusters.filter(({ count }) => count > 1).map(({ count }) => count),
  );
  const highlightedCluster = highlighted
    ? highlightedClusterIndex(clusters, highlighted, map.getBounds())
    : -1;

  return (
    <>
      {clusters.map((cluster, index) => {
        const { longitude, latitude, count, extent, number, sample } = cluster;
        const splitFrom = () => splitOrigin(previous, cluster);
        if (number !== undefined) {
          return (
            <SampleMarker
              key={number}
              longitude={longitude}
              latitude={latitude}
              sample={sample}
              isHighlighted={
                sample !== undefined && sample.igsn === highlighted?.igsn
              }
              from={splitFrom}
              onSelect={onSelectSample}
            />
          );
        }
        const isHighlighted = index === highlightedCluster;
        const zoomToExtent = () =>
          map.flyToBounds(extentBounds(extent), {
            animate: !prefersReducedMotion(),
          });
        const zoomHandlers = {
          click: zoomToExtent,
          keypress: ({ originalEvent }: L.LeafletKeyboardEvent) => {
            if (originalEvent.key === "Enter") zoomToExtent();
          },
        };
        return (
          <SplitMarker
            key={`${longitude},${latitude}`}
            from={splitFrom}
            position={[latitude, longitude]}
            title={m.results_map_cluster({ count })}
            icon={clusterIcon(
              count,
              isHighlighted,
              bubbleSizePx(count, maxCount),
            )}
            zIndexOffset={isHighlighted ? 1000 : 0}
            eventHandlers={atMaxZoom ? undefined : zoomHandlers}
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

function ClusterLayers({
  points,
  centered,
  showProgress,
  onViewportChange,
  onSelectSample,
  ...layers
}: {
  points: MapPoints;
  showProgress?: boolean;
  highlighted?: HoveredSample;
  centered?: HoveredSample;
  filters: SearchFilters;
  onViewportChange: (viewport: MapViewport) => void;
  onSelectSample: (sample?: HoveredSample) => void;
}) {
  const map = useMap();
  const [view, setView] = useState(() => ({
    bbox: boundsOf(map),
    zoom: map.getZoom(),
  }));
  useMapEvents({
    click() {
      onSelectSample();
    },
    moveend() {
      setView({ bbox: boundsOf(map), zoom: map.getZoom() });
      onViewportChange(viewportOf(map));
    },
  });
  useEffect(() => onViewportChange(viewportOf(map)), [map]);
  const { clusters, isError } = useMapClusters(points, MAX_ZOOM, view);
  const details = useMapSampleDetails(
    (clusters ?? []).flatMap(({ number }) =>
      number === undefined ? [] : [number],
    ),
  );
  const shown = clusters?.map(
    (cluster): ShownCluster => ({
      ...cluster,
      sample:
        cluster.number === undefined ? undefined : details.get(cluster.number),
    }),
  );

  return (
    <>
      {shown ? (
        <Clusters
          clusters={shown}
          zoom={view.zoom}
          onSelectSample={onSelectSample}
          {...layers}
        />
      ) : isError ? (
        <p role="alert" className={MAP_OVERLAY_CLASS}>
          {m.results_map_error()}
        </p>
      ) : showProgress ? (
        <MapProgress label={m.results_map_preparing()} />
      ) : (
        <p role="status" className={MAP_OVERLAY_CLASS}>
          {m.results_map_loading()}
        </p>
      )}
      <FocusSample sample={centered} clusters={shown} />
    </>
  );
}

function FocusSample({
  sample,
  clusters,
}: {
  sample?: HoveredSample;
  clusters?: ShownCluster[];
}) {
  const map = useMap();
  const pending = useRef<HoveredSample>(undefined);
  const isMoving = useRef(false);
  useMapEvents({
    movestart() {
      isMoving.current = true;
    },
    moveend() {
      isMoving.current = false;
    },
  });
  useEffect(() => {
    pending.current = sample;
  }, [sample]);
  useEffect(() => {
    const target = pending.current;
    if (!target || !clusters || isMoving.current) return;
    const point = highlightPoint(target.position, L.latLngBounds(WORLD_BOUNDS));
    const animate = !prefersReducedMotion();
    const cluster =
      clusters[highlightedClusterIndex(clusters, target, map.getBounds())];
    const zoom = map.getZoom();
    if (cluster && zoom < map.getMaxZoom()) {
      map.flyTo(
        point,
        Math.max(map.getBoundsZoom(extentBounds(cluster.extent)), zoom + 1),
        { animate },
      );
      return;
    }
    pending.current = undefined;
    map.panTo(point, { animate });
  }, [map, sample, clusters]);
  return null;
}

export function ResultsMap({
  fitTo,
  ...layers
}: {
  points: MapPoints;
  fitTo: Bbox | null;
  showProgress?: boolean;
  highlighted?: HoveredSample;
  centered?: HoveredSample;
  filters: SearchFilters;
  onViewportChange: (viewport: MapViewport) => void;
  onSelectSample: (sample?: HoveredSample) => void;
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
      <ClusterLayers {...layers} />
    </MapContainer>
  );
}
