import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";

import {
  type MapPointsParams,
  mapPoints,
} from "#/domain/samples/client/map-points.ts";

export const MAP_STALE_MS = 5 * 60_000;

const downloadPercentKey = (filters: MapPointsParams) => [
  "samples",
  "map",
  "points-download-percent",
  filters,
];

export function mapPointsQueryOptions(filters: MapPointsParams) {
  return queryOptions({
    queryKey: ["samples", "map", "points", filters],
    queryFn: ({ client }) =>
      mapPoints(filters, undefined, (percent) =>
        client.setQueryData(downloadPercentKey(filters), percent),
      ),
    staleTime: MAP_STALE_MS,
  });
}

export function useMapPoints(filters: MapPointsParams) {
  return useQuery(mapPointsQueryOptions(filters));
}

export function useMapPointsDownloadPercent(
  filters: MapPointsParams,
): number | undefined {
  return useQuery<number>({
    queryKey: downloadPercentKey(filters),
    queryFn: skipToken,
  }).data;
}
