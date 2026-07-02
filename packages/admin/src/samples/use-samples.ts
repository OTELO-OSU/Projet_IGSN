import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useSampleRepository } from "#/samples/use-sample-repository.ts";

export function useSamples(params: { page: number; perPage: number }) {
  const repository = useSampleRepository();
  return useQuery({
    queryKey: ["samples", params],
    queryFn: () => repository.list(params),
    // Keep the current page on screen while the next one loads so paging
    // doesn't flash "Loading..." and reset the pager to 1/1.
    placeholderData: keepPreviousData,
  });
}
