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
  compact?: boolean;
};

// Reserves the height server-side, so the map does not push the results down.
export function LazyLocationMap({ compact, ...props }: LazyLocationMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        className={compact ? "h-48" : "h-80"}
      >
        {mounted ? (
          <Suspense fallback={null}>
            <SearchLocationMap {...props} compact={compact} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
