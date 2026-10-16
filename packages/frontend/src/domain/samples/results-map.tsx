import "leaflet/dist/leaflet.css";
import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import { MapContainer } from "react-leaflet";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";
import type { MapPoints } from "#/domain/samples/map-cluster-index.ts";
import type { HoveredSample } from "#/domain/samples/map-highlight.ts";
import type { MapViewport } from "#/domain/samples/map-view-bounds.ts";

import { BaseMapLayer } from "#/domain/samples/base-map-layer.tsx";
import { ClusterLayers } from "#/domain/samples/map-cluster-layers.tsx";
import { openingBounds } from "#/domain/samples/map-view-bounds.ts";
import { WORLD_BOUNDS } from "#/domain/samples/search-location-map.tsx";

const MAX_ZOOM = 18;

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
      <BaseMapLayer />
      <ClusterLayers {...layers} />
    </MapContainer>
  );
}
