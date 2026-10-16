import "maplibre-gl/dist/maplibre-gl.css";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

import { keepLatinLabels } from "#/domain/samples/keep-latin-labels.ts";

setWorkerUrl(workerUrl);

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const ATTRIBUTION =
  '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function BaseMapLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = maplibreGL({
      attributionControl: { customAttribution: ATTRIBUTION },
      renderWorldCopies: false,
    }).addTo(map);
    layer.getMaplibreMap().setStyle(STYLE_URL, {
      transformStyle: (_previousStyle, nextStyle) => keepLatinLabels(nextStyle),
    });
    return () => {
      layer.remove();
    };
  }, [map]);
  return null;
}
