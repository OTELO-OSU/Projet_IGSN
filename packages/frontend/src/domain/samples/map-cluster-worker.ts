import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import {
  type MapCluster,
  type MapClusterIndex,
  buildClusterIndex,
  clustersInView,
} from "#/domain/samples/map-cluster-index.ts";

export type ClusterPointsMessage = {
  numbers: Float64Array;
  longitudes: Float64Array;
  latitudes: Float64Array;
  maxZoom: number;
};
export type ClusterRequest = { requestId: number; bbox: Bbox; zoom: number };
export type ClusterReply = { requestId: number; clusters: MapCluster[] };

let index: MapClusterIndex | undefined;

addEventListener(
  "message",
  ({ data }: MessageEvent<ClusterPointsMessage | ClusterRequest>) => {
    if ("numbers" in data) {
      index = buildClusterIndex(data, data.maxZoom);
      return;
    }
    if (!index) return;
    const reply: ClusterReply = {
      requestId: data.requestId,
      clusters: clustersInView(index, data.bbox, data.zoom),
    };
    postMessage(reply);
  },
);
