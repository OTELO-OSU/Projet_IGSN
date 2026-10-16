import type L from "leaflet";

import { Suspense, useState } from "react";
import { Popup, useMap } from "react-leaflet";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";
import type {
  HoveredSample,
  ShownCluster,
} from "#/domain/samples/map-highlight.ts";

import {
  bubbleSizePx,
  clusterIcon,
} from "#/domain/samples/map-cluster-icon.ts";
import { ClusterSamples } from "#/domain/samples/map-cluster-samples.tsx";
import { highlightedClusterIndex } from "#/domain/samples/map-highlight.ts";
import { SampleMarker } from "#/domain/samples/map-sample-marker.tsx";
import { extentBounds } from "#/domain/samples/map-view-bounds.ts";
import { SplitMarker, splitOrigin } from "#/domain/samples/split-marker.tsx";
import { m } from "#/paraglide/messages.js";
import { prefersReducedMotion } from "#/prefers-reduced-motion.ts";

export function Clusters({
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
