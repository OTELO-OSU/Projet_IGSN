# 0018. Frontend map stack: Leaflet + OSM tiles for location search

Date: 2026-07-22

## Status

Accepted. Realizes the map-draw phase ADR 0014 anticipated ("a map-draw
control is a further phase and pulls in a map-library dependency decision").

## Context

The public frontend Location search engine lets a reader Shift+drag a
rectangle on a world map and search published samples whose stored location
falls in that box. This needed an interactive map and a tile source, and the
repo had no map library. Adding one crosses the ask-before-adding-a-dependency
rule, so the user explicitly approved a map dependency for this feature.

## Decision

Use **Leaflet** (`leaflet ^1.9.4`) with **react-leaflet** (`^5.0.0`, the React
19 line) as the frontend map stack, rendering **OpenStreetMap raster tiles**
from `tile.openstreetmap.org`. The OSM usage policy requires attribution, so the
tile layer carries the standard OpenStreetMap attribution.

Rectangle selection uses Shift+mousedown/drag/mouseup on the map (no draw
plugin); a plain drag pans and scroll zooms, matching normal map controls. This
is mouse-only with no keyboard path to a bbox, a known WCAG 2.1.1 gap accepted
per product decision.

## Alternatives considered

- **MapLibre GL**: vector tiles, heavier runtime, and needs a hosted or bundled
  tile style. Overkill for a bounding-box picker that only needs a backdrop and
  a rectangle. Rejected.
- **No library (hand-rolled slippy map)**: a correct tiled, pannable, zoomable
  map is hundreds of lines to get right (tile math, gesture handling). Not the
  lazy choice and not viable. Rejected.

## Consequences

- A drawn rectangle maps 1:1 to the stored `geom` envelope: the box is passed to
  the `bbox` query param and filtered with `ST_MakeEnvelope(w,s,e,n,4326)` (ADR
  0014). Antimeridian-crossing boxes are out of scope for v1; the domain schema
  enforces `west <= east`.
- The map is client-only: Leaflet touches `window` at module scope, so the map
  module is lazy-imported behind a client mount gate, keeping it and its CSS off
  the SSR path while the rest of `/search` still server-renders.
- OSM public tiles carry a usage policy. Attribution is required (shipped).
  Revisit self-hosting or a tile provider, and the edge CSP `img-src` for the
  tile host, if traffic grows.

## Follow-ups

- Rate limiting on the public `GET /samples` list route, flagged by security
  review as a pre-existing gap unrelated to the map choice: closed, see
  [ADR 0020](0020-api-rate-limiting.md).
