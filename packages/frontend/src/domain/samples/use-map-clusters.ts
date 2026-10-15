import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import { useEffect, useRef, useState } from "react";

import type {
  MapCluster,
  MapPoints,
} from "#/domain/samples/map-cluster-index.ts";
import type {
  ClusterPointsMessage,
  ClusterReply,
  ClusterRequest,
} from "#/domain/samples/map-cluster-worker.ts";

export type MapView = { bbox: Bbox; zoom: number };

export function useMapClusters(
  points: MapPoints,
  maxZoom: number,
  view: MapView,
): { clusters?: MapCluster[]; isError: boolean } {
  const [reply, setReply] = useState<{
    points: MapPoints;
    clusters: MapCluster[];
  }>();
  const [failedPoints, setFailedPoints] = useState<MapPoints>();
  const worker = useRef<Worker>(undefined);
  const lastRequestId = useRef(0);

  useEffect(() => {
    const clusterWorker = new Worker(
      new URL("./map-cluster-worker.ts", import.meta.url),
      { type: "module" },
    );
    clusterWorker.addEventListener(
      "message",
      ({ data }: MessageEvent<ClusterReply>) => {
        if (data.requestId === lastRequestId.current) {
          setReply({ points, clusters: data.clusters });
        }
      },
    );
    const fail = (event: Event) => {
      event.preventDefault();
      setFailedPoints(points);
    };
    clusterWorker.addEventListener("error", fail);
    clusterWorker.addEventListener("messageerror", fail);
    const message: ClusterPointsMessage = {
      numbers: Float64Array.from(points.numbers),
      longitudes: Float64Array.from(points.longitudes),
      latitudes: Float64Array.from(points.latitudes),
      maxZoom,
    };
    clusterWorker.postMessage(message, [
      message.numbers.buffer,
      message.longitudes.buffer,
      message.latitudes.buffer,
    ]);
    worker.current = clusterWorker;
    return () => clusterWorker.terminate();
  }, [points, maxZoom]);

  useEffect(() => {
    lastRequestId.current += 1;
    const request: ClusterRequest = {
      requestId: lastRequestId.current,
      ...view,
    };
    worker.current?.postMessage(request);
  }, [points, maxZoom, view]);

  return {
    clusters: reply?.points === points ? reply.clusters : undefined,
    isError: failedPoints === points,
  };
}
