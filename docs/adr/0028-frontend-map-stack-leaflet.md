# 0028. Frontend map stack: Leaflet + OSM tiles for location search

Date: 2026-07-22

## Status

Accepted. Realizes the map-draw phase ADR 0014 anticipated.

## Context

The public frontend location search lets a reader draw a rectangle on a world map and search published samples whose stored location falls in that box. This needed an interactive map and a tile source, and the repo had no map library, so the user explicitly approved a map dependency for this feature.

## Decision

Use **Leaflet** (`leaflet ^1.9.4`) with **react-leaflet** (`^5.0.0`, the React 19 line), rendering **OpenStreetMap raster tiles** from `tile.openstreetmap.org`. The OSM usage policy requires attribution, so the tile layer carries the standard OpenStreetMap attribution.

Rectangle selection has two paths, neither pulling in a draw plugin: Shift+drag as an expert shortcut, documented in the draw button's tooltip rather than a hint above the map, or a "Draw an area" toggle that traces the rectangle over two plain clicks, keeping the map pannable in between and turning itself off once a box is committed. A plain drag pans and scroll zooms, in draw mode too, matching normal map controls. Both paths are mouse-only with no keyboard path to a bbox, a known WCAG 2.1.1 gap accepted per product decision.

Rejected: **MapLibre GL**, vector tiles with a heavier runtime and a hosted or bundled tile style, overkill for a bounding-box picker that needs a backdrop and a rectangle. Rejected: **a hand-rolled slippy map**, since a correct tiled, pannable, zoomable map is hundreds of lines of tile math and gesture handling.

## Consequences

- A drawn rectangle maps 1:1 to the stored `geom` envelope: the box rides the `bbox` query param and filters with `ST_MakeEnvelope` (ADR 0014). Antimeridian-crossing boxes are out of scope for v1, the domain schema enforcing `west <= east`.
- The map is client-only, Leaflet touching `window` at module scope, so the map module is lazy-imported behind a client mount gate, keeping it and its CSS off the SSR path while the rest of `/search` still server-renders.
- OSM public tiles carry a usage policy. Attribution ships; revisit self-hosting or a tile provider, and the edge CSP `img-src` for the tile host, if traffic grows.
- Rate limiting on the public `GET /samples` route, flagged by security review as a pre-existing gap unrelated to the map choice, is closed by [ADR 0029](0029-api-rate-limiting.md).
