import mapWrapperSource from "../domain/samples/lazy-location-map.tsx?raw";
// Dash-prefixed so the TanStack router ignores it (no Route export).
import indexSource from "./index.tsx?raw";
import searchSource from "./search.tsx?raw";

// The browser test harness always has `window`, so it cannot reproduce the SSR
// crash directly. The defect is a bundler property: a *static* import of the
// leaflet map module puts leaflet (which touches `window` at module scope) in
// the server import graph, crashing the page during SSR. Guard that property:
// the map must be reached only through the lazy wrapper, and no route may pull
// the map module or leaflet into its static graph.
describe("map SSR safety", () => {
  it("loads the leaflet map lazily in the wrapper", () => {
    expect(mapWrapperSource).toMatch(/lazy\(\(\)\s*=>\s*import\(/);
    expect(mapWrapperSource).not.toMatch(/^import[^\n]*["']leaflet/m);
  });

  it.each([
    ["search", searchSource],
    ["index", indexSource],
  ])("keeps the map out of the %s static graph", (_name, source) => {
    expect(source).not.toMatch(/^import[^\n]*search-location-map/m);
    expect(source).not.toMatch(/^import[^\n]*["']leaflet/m);
  });
});
