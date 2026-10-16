import {
  MAP_LIST_PAGE_SIZE,
  bboxSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";
import type { HoveredSample } from "#/domain/samples/map-highlight.ts";

import { type CardSample } from "#/domain/samples/card-fields.ts";
import { getSampleByIgsnQueryOptions } from "#/domain/samples/hook/get-sample-by-igsn.ts";
import { listSamplePagesQueryOptions } from "#/domain/samples/hook/list-samples.ts";
import { useMapPoints } from "#/domain/samples/hook/map-points.ts";
import { countPointsInView } from "#/domain/samples/map-point-bounds.ts";
import { SampleList, focusSampleCard } from "#/domain/samples/sample-list.tsx";
import { searchEmptyMessage } from "#/domain/samples/search-empty-message.ts";
import {
  CardFieldPicker,
  ResultsCount,
} from "#/domain/samples/search-results-view.tsx";
import { useCardFields } from "#/domain/samples/use-card-fields.ts";
import { m } from "#/paraglide/messages.js";

const PLACEHOLDER_TITLE_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-3/5"];

function toMapSample(
  sample: CardSample | undefined,
): HoveredSample | undefined {
  const position = sample?.location?.position;
  return sample?.igsn && position ? { igsn: sample.igsn, position } : undefined;
}

function ResultsMapListPlaceholder() {
  return (
    <div className="flex flex-col gap-4">
      <p className="sr-only">{m.results_map_list_loading()}</p>
      <div
        aria-hidden
        className="flex flex-col gap-4 motion-safe:animate-pulse"
      >
        <div className="bg-muted h-6 w-28 rounded-md" />
        {PLACEHOLDER_TITLE_WIDTHS.map((titleWidth) => (
          <div
            key={titleWidth}
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className={`bg-muted h-5 rounded-md ${titleWidth}`} />
            <div className="bg-muted h-4 w-1/2 rounded-md" />
            <div className="bg-muted h-4 w-2/5 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NextPageTrigger({ onReached }: { onReached: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) onReached();
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onReached]);
  return <div ref={ref} />;
}

export function ResultsMapList({
  filters,
  viewport,
  selectedIgsn,
  pinnedIgsn,
  onHoverSample,
  onLocateSample,
}: {
  filters: SearchFilters;
  viewport?: string;
  selectedIgsn?: string;
  pinnedIgsn?: string;
  onHoverSample: (sample: HoveredSample | undefined) => void;
  onLocateSample: (sample: HoveredSample) => void;
}) {
  const { data: points, isError: isPointsError } = useMapPoints(filters);
  const count =
    points && viewport
      ? countPointsInView(points.data, bboxSchema.parse(viewport))
      : undefined;
  const {
    data,
    isError: isListError,
    hasNextPage,
    isFetchingNextPage,
    isPlaceholderData,
    fetchNextPage,
  } = useInfiniteQuery({
    ...listSamplePagesQueryOptions({
      ...filters,
      viewport,
      perPage: MAP_LIST_PAGE_SIZE,
      withTotal: false,
    }),
    enabled: viewport !== undefined,
    placeholderData: keepPreviousData,
  });
  const { data: pinnedData } = useQuery({
    ...getSampleByIgsnQueryOptions(pinnedIgsn ?? ""),
    enabled: pinnedIgsn !== undefined,
  });
  const pinned: CardSample | undefined =
    pinnedData?.status === "published"
      ? pinnedData
      : data?.pages
          .flatMap((page) => page.data)
          .find(({ igsn }) => pinnedIgsn !== undefined && igsn === pinnedIgsn);
  const { fields, saveFields } = useCardFields();

  useEffect(() => {
    if (pinned && pinnedIgsn) focusSampleCard(pinnedIgsn);
  }, [pinned, pinnedIgsn]);

  if (count === undefined || !data) {
    return isPointsError || isListError ? null : <ResultsMapListPlaceholder />;
  }
  if (data.pages[0]?.data.length === 0 && !pinned) {
    return (
      <p role="status" className="text-muted-foreground text-center">
        {searchEmptyMessage(filters)}
      </p>
    );
  }

  const samples = [
    ...new Map(
      [
        ...(pinned ? [pinned] : []),
        ...data.pages.flatMap((page) => page.data),
      ].map((sample) => [sample.igsn, sample]),
    ).values(),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ResultsCount total={count} />
        <CardFieldPicker fields={fields} onFieldsChange={saveFields} />
      </div>
      <SampleList
        samples={samples}
        fields={fields}
        query={filters.search}
        selectedIgsn={selectedIgsn}
        onHoverSample={(sample) => onHoverSample(toMapSample(sample))}
        onLocateSample={(sample) => {
          const located = toMapSample(sample);
          if (located) onLocateSample(located);
        }}
        columnsClassName="md:portrait:grid-cols-2"
      />
      {hasNextPage && !isFetchingNextPage && !isPlaceholderData ? (
        <NextPageTrigger onReached={() => void fetchNextPage()} />
      ) : null}
    </div>
  );
}
