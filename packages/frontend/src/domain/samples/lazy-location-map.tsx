import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";

import { m } from "#/paraglide/messages.js";

// Leaflet touches `window` at module scope, so it must stay off the SSR path.
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

// Reserves the height server-side, so the map does not push the results down.
export function LazyLocationMap({
  collapsible = false,
  ...props
}: LazyLocationMapProps) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setMounted(true), []);
  const compact = collapsible && !expanded;

  return (
    <div>
      <p id={HINT_ID} className="mb-2 text-sky-100">
        {m.search_map_hint()}
      </p>
      {/* react-leaflet's MapContainer does not forward role/aria-*. */}
      <div
        role="group"
        aria-label={m.search_map_label()}
        aria-describedby={HINT_ID}
        className={`relative ${compact ? "h-48" : "h-100"}`}
      >
        {mounted ? (
          <Suspense fallback={null}>
            <SearchLocationMap {...props} compact={compact} />
          </Suspense>
        ) : null}
        {collapsible ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute end-2 top-2 z-[1001]"
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
              <TooltipContent className="z-[1001]">
                {compact ? m.search_map_enlarge() : m.search_map_shrink()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  );
}
