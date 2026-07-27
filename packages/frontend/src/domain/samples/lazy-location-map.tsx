import { Suspense, lazy, useEffect, useState } from "react";

// Leaflet touches `window` at module scope, so the map module must never be in
// the server import graph. Lazy + a client-only mount gate keeps the whole
// module (and its CSS) off the SSR path; callers server-render everything else.
// Both search entry points (the landing and /search) render the map through
// here, so the SSR footgun lives in one guarded place.
const SearchLocationMap = lazy(() =>
  import("#/domain/samples/search-location-map.tsx").then((module) => ({
    default: module.SearchLocationMap,
  })),
);

type LazyLocationMapProps = {
  onSearch: (bbox: string) => void;
  initialBbox?: string;
  compact?: boolean;
};

export function LazyLocationMap(props: LazyLocationMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <SearchLocationMap {...props} />
    </Suspense>
  );
}
