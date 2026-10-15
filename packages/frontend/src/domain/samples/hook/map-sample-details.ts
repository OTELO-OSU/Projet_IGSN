import type { SampleMapDetailsResponse } from "@projet-igsn/domain/sample/map/model";

import {
  MAX_MAP_DETAILS_NUMBERS,
  type SampleMapDetail,
} from "@projet-igsn/domain/sample/map/model";
import {
  type UseQueryResult,
  queryOptions,
  useQueries,
} from "@tanstack/react-query";
import { useState } from "react";

import { mapSampleDetails } from "#/domain/samples/client/map-sample-details.ts";
import { MAP_STALE_MS } from "#/domain/samples/hook/map-points.ts";

export function mapSampleDetailsQueryOptions(numbers: number[]) {
  return queryOptions({
    queryKey: ["samples", "map", "details", numbers],
    queryFn: () => mapSampleDetails(numbers),
    staleTime: MAP_STALE_MS,
  });
}

const chunksOf = (numbers: number[]): number[][] =>
  Array.from(
    { length: Math.ceil(numbers.length / MAX_MAP_DETAILS_NUMBERS) },
    (_, index) =>
      numbers.slice(
        index * MAX_MAP_DETAILS_NUMBERS,
        (index + 1) * MAX_MAP_DETAILS_NUMBERS,
      ),
  );

const detailsByNumber = (
  results: UseQueryResult<SampleMapDetailsResponse>[],
): Map<number, SampleMapDetail> =>
  new Map(
    results
      .flatMap(({ data }) => data?.data ?? [])
      .map((detail) => [detail.internalNumber, detail]),
  );

export function useMapSampleDetails(
  numbers: number[],
): Map<number, SampleMapDetail> {
  const [chunks, setChunks] = useState<number[][]>([]);
  const requested = new Set(chunks.flat());
  const missing = numbers.filter((number) => !requested.has(number));
  if (missing.length > 0) {
    setChunks([...chunks, ...chunksOf(missing)]);
  }
  return useQueries({
    queries: chunks.map((chunk) => mapSampleDetailsQueryOptions(chunk)),
    combine: detailsByNumber,
  });
}
