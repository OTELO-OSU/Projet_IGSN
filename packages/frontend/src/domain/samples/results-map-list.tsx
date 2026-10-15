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
import type { HoveredSample } from "#/domain/samples/results-map.tsx";

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

function toMapSample(
  sample: CardSample | undefined,
): HoveredSample | undefined {
  const position = sample?.location?.position;
  return sample?.igsn && position ? { igsn: sample.igsn, position } : undefined;
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
  const { data: points } = useMapPoints(filters);
  const count =
    points && viewport
      ? countPointsInView(points.data, bboxSchema.parse(viewport))
      : undefined;
  const {
    data,
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
    pinnedData?.status === "published" ? pinnedData : undefined;
  const { fields, saveFields } = useCardFields();

  useEffect(() => {
    if (pinned && pinnedIgsn) focusSampleCard(pinnedIgsn);
  }, [pinned, pinnedIgsn]);

  if (count === undefined || !data) return null;
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
        singleColumn
      />
      {hasNextPage && !isFetchingNextPage && !isPlaceholderData ? (
        <NextPageTrigger onReached={() => void fetchNextPage()} />
      ) : null}
    </div>
  );
}
