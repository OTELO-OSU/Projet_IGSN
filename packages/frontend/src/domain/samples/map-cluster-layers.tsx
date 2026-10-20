import { useEffect, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";
import type { MapPoints } from "#/domain/samples/map-cluster-index.ts";
import type {
  HoveredSample,
  ShownCluster,
} from "#/domain/samples/map-highlight.ts";
import type { MapViewport } from "#/domain/samples/map-view-bounds.ts";

import { useMapSampleDetails } from "#/domain/samples/hook/map-sample-details.ts";
import { Clusters } from "#/domain/samples/map-clusters.tsx";
import { FocusSample } from "#/domain/samples/map-focus-sample.tsx";
import {
  MAP_OVERLAY_CLASS,
  MapProgress,
} from "#/domain/samples/map-progress.tsx";
import { boundsOf, viewportOf } from "#/domain/samples/map-view-bounds.ts";
import { useMapClusters } from "#/domain/samples/use-map-clusters.ts";
import { m } from "#/paraglide/messages.js";

export function ClusterLayers({
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
  const { clusters, isError } = useMapClusters(points, map.getMaxZoom(), view);
  const details = useMapSampleDetails(
    (clusters ?? []).flatMap(({ number }) =>
      number === undefined ? [] : [number],
    ),
  );
  const shown = clusters?.map((cluster): ShownCluster => ({
    ...cluster,
    sample:
      cluster.number === undefined ? undefined : details.get(cluster.number),
  }));

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
