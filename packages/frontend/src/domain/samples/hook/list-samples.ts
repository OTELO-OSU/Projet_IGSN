import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import {
  type ListSamplesParams,
  listSamples,
} from "#/domain/samples/client/list-samples.ts";

export function listSamplesQueryOptions(params: ListSamplesParams) {
  return queryOptions({
    queryKey: ["samples", params],
    queryFn: () => listSamples(params),
  });
}

export function useListSamples(params: ListSamplesParams) {
  return useSuspenseQuery(listSamplesQueryOptions(params));
}
