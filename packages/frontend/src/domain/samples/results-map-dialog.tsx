import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { MapIcon } from "lucide-react";
import { Suspense, lazy, useId, useState } from "react";

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
  highlighted,
  onUserMove,
}: {
  filters: SearchFilters;
  highlighted?: HoveredSample;
  onUserMove: (viewport: string) => void;
}) {
  const [viewport, setViewport] = useState<MapViewport>({
    bbox: filters.bbox ?? WHOLE_WORLD,
    zoom: OPENING_ZOOM,
  });
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
        filters={filters}
        onViewportChange={setViewport}
        onUserMove={onUserMove}
      />
    </Suspense>
  );
}

function ResultsMapContent({
  params: { page: _page, perPage: _perPage, ...filters },
}: {
  params: ListSamplesParams;
}) {
  const switchId = useId();
  const [isSearchingWhileMoving, setIsSearchingWhileMoving] = useState(true);
  const [highlighted, setHighlighted] = useState<HoveredSample>();
  const [movedTo, setMovedTo] = useState<string>();

  return (
    <>
      <DialogHeader className="pe-8">
        <DialogTitle>{m.results_map_title()}</DialogTitle>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-4 md:grid-cols-[1fr_3fr] md:grid-rows-1">
        <div className="row-start-2 min-h-0 overflow-y-auto px-2 md:row-start-1">
          <ResultsMapList
            filters={{
              ...filters,
              viewport: isSearchingWhileMoving ? movedTo : undefined,
            }}
            onHoverSample={setHighlighted}
            actions={
              <div className="flex items-center gap-2">
                <Switch
                  id={switchId}
                  checked={isSearchingWhileMoving}
                  onCheckedChange={setIsSearchingWhileMoving}
                />
                <Label htmlFor={switchId}>
                  {m.results_map_search_while_moving()}
                </Label>
              </div>
            }
          />
        </div>
        <section
          aria-label={m.results_map_map_label()}
          className="row-start-1 min-h-0 md:col-start-2"
        >
          <MapPane
            filters={filters}
            highlighted={highlighted}
            onUserMove={setMovedTo}
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
