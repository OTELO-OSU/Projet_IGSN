---
type: feature
title: Map bounding-box search with Leaflet
description: >-
  Leaflet plus react-leaflet over OSM raster tiles; a drawn rectangle rides the
  bbox query param into an ST_MakeEnvelope filter.
resource: packages/frontend/src/domain/sample/map
tags:
  - frontend
  - search
  - map
relations:
  - type: depends_on
    target: sample-location
  - type: depends_on
    target: search-facets
status: stable
---

The public location search lets a reader draw a rectangle on a world map and search published samples whose stored location falls in that box.

- Stack: `leaflet ^1.9.4` with `react-leaflet ^5.0.0` (the React 19 line), rendering OpenStreetMap raster tiles from `tile.openstreetmap.org`. The OSM usage policy requires the standard attribution on the tile layer, and the edge CSP `img-src` must allow the tile host.
- Rectangle selection has two paths and pulls in no draw plugin: Shift+drag as an expert shortcut documented in the draw button's tooltip, or a "Draw an area" toggle tracing the rectangle over two plain clicks, keeping the map pannable in between and turning itself off once a box is committed. Plain drag pans and scroll zooms, in draw mode too.
- Both paths are mouse-only with no keyboard path to a bbox, a known WCAG 2.1.1 gap accepted by product decision.
- The box rides the `bbox` query param, lives in the URL, and filters with `ST_MakeEnvelope` against the generated `geom` column ([[sample-location]]). Antimeridian-crossing boxes are out of scope for v1, the domain schema enforcing `west <= east`.
- The map is client-only, Leaflet touching `window` at module scope, so the map module is lazy-imported behind a client mount gate while the rest of `/search` still server-renders.
