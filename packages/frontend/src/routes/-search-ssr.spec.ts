// Dash-prefixed so the TanStack router ignores it (no Route export).
import searchSource from "./search.tsx?raw";

// The browser test harness always has `window`, so it cannot reproduce the SSR
// crash directly. The defect is a bundler property: a *static* import of the
// leaflet map module puts leaflet (which touches `window` at module scope) in
// the server import graph, crashing /search during SSR. Guard that property:
// the map must be a lazy (client-only) import, and neither leaflet nor the map
// module may be imported statically here.
describe("/search SSR safety", () => {
  it("loads the leaflet map lazily, not in the static graph", () => {
    expect(searchSource).toMatch(/lazy\(\(\)\s*=>\s*import\(/);
    expect(searchSource).not.toMatch(/^import[^\n]*search-location-map/m);
    expect(searchSource).not.toMatch(/^import[^\n]*["']leaflet/m);
  });
});
