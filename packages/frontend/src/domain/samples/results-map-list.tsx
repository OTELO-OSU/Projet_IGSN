import { Loader2Icon } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";
import type { HoveredSample } from "#/domain/samples/results-map.tsx";

import { useListSamplesInfinite } from "#/domain/samples/hook/list-samples-infinite.ts";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { ResultsCount } from "#/domain/samples/search-results-view.tsx";
import { useCardFields } from "#/domain/samples/use-card-fields.ts";
import { m } from "#/paraglide/messages.js";

export function ResultsMapList({
  filters,
  onHoverSample,
  actions,
}: {
  filters: SearchFilters;
  actions: ReactNode;
  onHoverSample: (sample: HoveredSample | undefined) => void;
}) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useListSamplesInfinite(filters);
  const { fields } = useCardFields();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const total = data?.pages[0]?.total ?? 0;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!data) return null;
  const samples = data.pages.flatMap((page) => page.data);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        {actions}
        <p role="status" className="text-muted-foreground text-center">
          {m.search_no_results()}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ResultsCount total={total} />
        {actions}
      </div>
      <SampleList
        samples={samples}
        fields={fields}
        query={filters.search}
        onHoverSample={(sample) => {
          const position = sample?.location?.position;
          onHoverSample(
            sample?.igsn && position
              ? { igsn: sample.igsn, position }
              : undefined,
          );
        }}
        singleColumn
      />
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {isFetchingNextPage ? (
        <p
          role="status"
          className="text-muted-foreground flex items-center justify-center gap-2 pb-4"
        >
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
          {m.results_map_loading_more()}
        </p>
      ) : null}
    </div>
  );
}
