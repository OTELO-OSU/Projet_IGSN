import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";

import {
  type MapSamplesParams,
  mapSamples,
} from "#/domain/samples/client/map-samples.ts";

export function mapSamplesQueryOptions(params: MapSamplesParams) {
  return queryOptions({
    queryKey: ["samples", "map", params],
    queryFn: () => mapSamples(params),
    placeholderData: keepPreviousData,
  });
}

export function useMapSamples(params: MapSamplesParams) {
  return useQuery(mapSamplesQueryOptions(params));
}
