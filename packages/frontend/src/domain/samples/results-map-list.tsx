import { MAP_LIST_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";
import type { HoveredSample } from "#/domain/samples/results-map.tsx";

import { type CardSample } from "#/domain/samples/card-fields.ts";
import { listSamplesQueryOptions } from "#/domain/samples/hook/list-samples.ts";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { searchEmptyMessage } from "#/domain/samples/search-empty-message.ts";
import {
  CardFieldPicker,
  ResultsCount,
} from "#/domain/samples/search-results-view.tsx";
import { useCardFields } from "#/domain/samples/use-card-fields.ts";
import { m } from "#/paraglide/messages.js";

function toMapSample(
  sample: CardSample | undefined,
): HoveredSample | undefined {
  const position = sample?.location?.position;
  return sample?.igsn && position ? { igsn: sample.igsn, position } : undefined;
}

export function ResultsMapList({
  filters,
  selectedIgsn,
  onHoverSample,
  onLocateSample,
}: {
  filters: SearchFilters;
  selectedIgsn?: string;
  onHoverSample: (sample: HoveredSample | undefined) => void;
  onLocateSample: (sample: HoveredSample) => void;
}) {
  const { data } = useQuery({
    ...listSamplesQueryOptions({
      ...filters,
      page: 1,
      perPage: MAP_LIST_SIZE,
    }),
    placeholderData: keepPreviousData,
  });
  const { fields, saveFields } = useCardFields();

  if (!data) return null;
  if (data.total === 0) {
    return (
      <p role="status" className="text-muted-foreground text-center">
        {searchEmptyMessage(filters)}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ResultsCount total={data.total} />
        <CardFieldPicker fields={fields} onFieldsChange={saveFields} />
      </div>
      {data.total > MAP_LIST_SIZE ? (
        <p role="status" className="text-muted-foreground">
          {m.results_map_capped({ count: MAP_LIST_SIZE })}
        </p>
      ) : null}
      <SampleList
        samples={data.data}
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
    </div>
  );
}
