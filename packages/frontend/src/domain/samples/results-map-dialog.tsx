import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";
import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { MapIcon } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";

import type { HoveredSample } from "#/domain/samples/map-highlight.ts";
import type { MapViewport } from "#/domain/samples/map-view-bounds.ts";

import {
  type ListSamplesParams,
  type SearchFilters,
  searchFilterParams,
} from "#/domain/samples/client/list-samples.ts";
import {
  useMapPoints,
  useMapPointsDownloadPercent,
} from "#/domain/samples/hook/map-points.ts";
import { pointsExtent } from "#/domain/samples/map-point-bounds.ts";
import { MapProgress } from "#/domain/samples/map-progress.tsx";
import { ResultsMapList } from "#/domain/samples/results-map-list.tsx";
import { m } from "#/paraglide/messages.js";

const PROGRESS_DELAY_MS = 500;

const ResultsMap = lazy(() =>
  import("#/domain/samples/results-map.tsx").then((module) => ({
    default: module.ResultsMap,
  })),
);

function MapPane({
  filters,
  highlighted,
  centered,
  onViewportChange,
  onSelectSample,
}: {
  filters: SearchFilters;
  highlighted?: HoveredSample;
  centered?: HoveredSample;
  onViewportChange: (viewport: MapViewport) => void;
  onSelectSample: (sample?: HoveredSample) => void;
}) {
  const { data, isError, isFetchedAfterMount } = useMapPoints(filters);
  const percent = useMapPointsDownloadPercent(filters);
  const hasCriteria = searchFilterParams(filters).size > 0;
  const [delayElapsed, setDelayElapsed] = useState(!hasCriteria);
  useEffect(() => {
    const timer = setTimeout(() => setDelayElapsed(true), PROGRESS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  const showProgress = delayElapsed && (!data || isFetchedAfterMount);

  if (isError) {
    return <p role="alert">{m.results_map_error()}</p>;
  }
  return (
    <div className="relative h-full">
      {data ? (
        <Suspense
          fallback={
            showProgress ? (
              <MapProgress label={m.results_map_preparing()} />
            ) : null
          }
        >
          <ResultsMap
            points={data.data}
            showProgress={showProgress}
            fitTo={
              filters.bbox
                ? bboxSchema.parse(filters.bbox)
                : pointsExtent(data.data)
            }
            highlighted={highlighted}
            centered={centered}
            filters={filters}
            onViewportChange={onViewportChange}
            onSelectSample={onSelectSample}
          />
        </Suspense>
      ) : showProgress ? (
        <MapProgress
          label={
            percent === undefined
              ? m.results_map_downloading()
              : m.results_map_downloading_percent({ percent })
          }
          percent={percent}
        />
      ) : null}
    </div>
  );
}

function ResultsMapContent({
  params: { page: _page, perPage: _perPage, ...filters },
}: {
  params: ListSamplesParams;
}) {
  const [viewport, setViewport] = useState<MapViewport>();
  const [highlighted, setHighlighted] = useState<HoveredSample>();
  const [selected, setSelected] = useState<HoveredSample>();
  const [centered, setCentered] = useState<HoveredSample>();
  const [pinnedIgsn, setPinnedIgsn] = useState<string>();

  function selectSample(sample?: HoveredSample) {
    setSelected(sample);
    setPinnedIgsn(sample?.igsn);
  }

  return (
    <>
      <DialogHeader className="pe-8">
        <DialogTitle>{m.results_map_title()}</DialogTitle>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-4 md:grid-cols-[1fr_3fr] md:grid-rows-1">
        <div className="row-start-2 min-h-0 overflow-y-auto px-2 pb-3 motion-safe:scroll-smooth md:row-start-1">
          <ResultsMapList
            filters={filters}
            viewport={viewport?.bbox}
            selectedIgsn={selected?.igsn}
            pinnedIgsn={pinnedIgsn === selected?.igsn ? pinnedIgsn : undefined}
            onHoverSample={setHighlighted}
            onLocateSample={(sample) => {
              setSelected(sample);
              setCentered(sample);
            }}
          />
        </div>
        <section
          aria-label={m.results_map_map_label()}
          className="row-start-1 min-h-0 md:col-start-2"
        >
          <MapPane
            filters={filters}
            highlighted={highlighted ?? selected}
            centered={centered}
            onViewportChange={setViewport}
            onSelectSample={selectSample}
          />
        </section>
      </div>
    </>
  );
}

export function ResultsMapButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      <MapIcon aria-hidden="true" />
      {m.results_map_open()}
    </Button>
  );
}

export function ResultsMapDialog({
  open,
  onOpenChange,
  params,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: ListSamplesParams;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={m.action_close()}
        aria-describedby={undefined}
        className="flex h-dvh max-h-none w-screen max-w-none flex-col overflow-hidden rounded-none sm:max-w-none md:h-[90vh] md:w-[95vw] md:rounded-lg"
      >
        <ResultsMapContent params={params} />
      </DialogContent>
    </Dialog>
  );
}
