import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";
import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { MapIcon } from "lucide-react";
import { Suspense, lazy, useState } from "react";

import type {
  ListSamplesParams,
  SearchFilters,
} from "#/domain/samples/client/list-samples.ts";
import type {
  HoveredSample,
  MapViewport,
} from "#/domain/samples/results-map.tsx";

import { useMapSamples } from "#/domain/samples/hook/map-samples.ts";
import { ResultsMapList } from "#/domain/samples/results-map-list.tsx";
import { focusSampleCard } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

const ResultsMap = lazy(() =>
  import("#/domain/samples/results-map.tsx").then((module) => ({
    default: module.ResultsMap,
  })),
);

const WHOLE_WORLD = "-180,-90,180,90";
const OPENING_ZOOM = 2;

function MapPane({
  filters,
  viewport,
  highlighted,
  centered,
  onViewportChange,
  onSelectSample,
}: {
  filters: SearchFilters;
  viewport: MapViewport;
  highlighted?: HoveredSample;
  centered?: HoveredSample;
  onViewportChange: (viewport: MapViewport) => void;
  onSelectSample: (sample?: HoveredSample) => void;
}) {
  const { data, isError } = useMapSamples({
    ...filters,
    viewport: viewport.bbox,
    zoom: viewport.zoom,
  });

  if (isError) {
    return <p role="alert">{m.results_map_error()}</p>;
  }
  if (!data) return null;
  return (
    <Suspense fallback={null}>
      <ResultsMap
        clusters={data.data}
        fitTo={filters.bbox ? bboxSchema.parse(filters.bbox) : data.meta.extent}
        highlighted={highlighted}
        centered={centered}
        filters={filters}
        onViewportChange={onViewportChange}
        onSelectSample={onSelectSample}
      />
    </Suspense>
  );
}

function ResultsMapContent({
  params: { page: _page, perPage: _perPage, ...filters },
}: {
  params: ListSamplesParams;
}) {
  const [viewport, setViewport] = useState<MapViewport>({
    bbox: filters.bbox ?? WHOLE_WORLD,
    zoom: OPENING_ZOOM,
  });
  const [highlighted, setHighlighted] = useState<HoveredSample>();
  const [selected, setSelected] = useState<HoveredSample>();
  const [centered, setCentered] = useState<HoveredSample>();

  function selectSample(sample?: HoveredSample) {
    setSelected(sample && focusSampleCard(sample.igsn) ? sample : undefined);
  }

  return (
    <>
      <DialogHeader className="pe-8">
        <DialogTitle>{m.results_map_title()}</DialogTitle>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-4 md:grid-cols-[1fr_3fr] md:grid-rows-1">
        <div className="row-start-2 min-h-0 overflow-y-auto px-2 pb-3 motion-safe:scroll-smooth md:row-start-1">
          <ResultsMapList
            filters={{ ...filters, viewport: viewport.bbox }}
            selectedIgsn={selected?.igsn}
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
            viewport={viewport}
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
    <Button type="button" variant="secondary" onClick={onClick}>
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
