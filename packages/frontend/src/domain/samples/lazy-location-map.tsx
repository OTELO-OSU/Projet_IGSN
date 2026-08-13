import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { Maximize2Icon, Minimize2Icon, SquareDashedIcon } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";

import { m } from "#/paraglide/messages.js";

const SearchLocationMap = lazy(() =>
  import("#/domain/samples/search-location-map.tsx").then((module) => ({
    default: module.SearchLocationMap,
  })),
);

const HINT_ID = "search-map-hint";

type LazyLocationMapProps = {
  value?: string;
  onChange: (bbox: string) => void;
  collapsible?: boolean;
};

export function LazyLocationMap({
  collapsible = false,
  onChange,
  value,
}: LazyLocationMapProps) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [drawing, setDrawing] = useState(false);
  useEffect(() => setMounted(true), []);
  const compact = collapsible && !expanded;

  return (
    <div>
      <p id={HINT_ID} className="mb-2 text-sky-100">
        {m.search_map_hint()}
      </p>
      <div
        role="group"
        aria-label={m.search_map_label()}
        aria-describedby={HINT_ID}
        className={`relative ${compact ? "h-48" : "h-100"}`}
      >
        {mounted ? (
          <Suspense fallback={null}>
            <SearchLocationMap
              value={value}
              compact={compact}
              drawing={drawing}
              onChange={(bbox) => {
                setDrawing(false);
                onChange(bbox);
              }}
            />
          </Suspense>
        ) : null}
        <TooltipProvider>
          <div className="absolute start-2 bottom-2 flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={drawing ? "default" : "outline"}
                  aria-pressed={drawing}
                  onClick={() => setDrawing(!drawing)}
                >
                  <SquareDashedIcon aria-hidden="true" />
                  {m.search_map_draw()}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{m.search_map_draw_hint()}</TooltipContent>
            </Tooltip>
            {collapsible ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={drawing}
                    aria-label={
                      compact ? m.search_map_enlarge() : m.search_map_shrink()
                    }
                    onClick={() => setExpanded(!expanded)}
                  >
                    {compact ? (
                      <Maximize2Icon aria-hidden="true" />
                    ) : (
                      <Minimize2Icon aria-hidden="true" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {compact ? m.search_map_enlarge() : m.search_map_shrink()}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
