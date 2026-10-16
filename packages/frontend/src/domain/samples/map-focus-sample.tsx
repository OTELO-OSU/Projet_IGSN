import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import type {
  HoveredSample,
  ShownCluster,
} from "#/domain/samples/map-highlight.ts";

import {
  highlightPoint,
  highlightedClusterIndex,
} from "#/domain/samples/map-highlight.ts";
import { extentBounds } from "#/domain/samples/map-view-bounds.ts";
import { WORLD_BOUNDS } from "#/domain/samples/search-location-map.tsx";
import { prefersReducedMotion } from "#/prefers-reduced-motion.ts";

export function FocusSample({
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
