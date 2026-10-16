# 0062. Frontend basemap: OpenFreeMap vector tiles via MapLibre GL in Leaflet

Date: 2026-10-15

## Status

Accepted. Supersedes the tile-source choice and the MapLibre rejection of [ADR 0028](0028-frontend-map-stack-leaflet.md).

## Context

The three public maps (search location picker, results map, sample location map) drew OSM raster tiles, whose labels use the local script only, so China showed Chinese only.
Readers need Latin names everywhere, and the tile source must be free and openly licensed.

## Decision

Draw the basemap from **OpenFreeMap** vector tiles (style `https://tiles.openfreemap.org/styles/liberty`, free, no API key, OSM data under ODbL), rendered by **MapLibre GL** v6 inside Leaflet through `@maplibre/maplibre-gl-leaflet`.
`BaseMapLayer` (`packages/frontend/src/domain/samples/base-map-layer.tsx`) replaces `OsmTileLayer`.
Labels show the Latin name alone ("Beijing"): `keepLatinLabels` drops the style's second, native-script line before the style applies.
Leaflet and react-leaflet stay, so the rectangle drawing and markers are unchanged.

Rejected, each checked by downloading tiles over Beijing:

- **OSM France tiles**: French names for big places, small Chinese villages stay Chinese only.
- **OSM Germany tiles**: Latin everywhere but adds German exonyms ("Frankreich / France", "Peking").
- **Esri World Street Map**: Latin everywhere but proprietary terms.
- **CARTO basemaps**: now require an API key.

## Consequences

- MapLibre adds roughly 800 KB to the lazy map chunk only.
- OpenFreeMap is a free community service with no SLA.
- A future CSP must allow `connect-src https://tiles.openfreemap.org` and the same-origin MapLibre worker.
- The attribution credits OpenFreeMap, OpenMapTiles and OpenStreetMap.
