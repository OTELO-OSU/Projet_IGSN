---
type: persistence
title: "Sample location: PostGIS storage and model"
description: >-
  Raw coordinate columns on a shared location table are the CRUD source of
  truth; a generated planar geometry column carries the GiST-indexed search
  geometry.
resource: packages/domain/src/sample/location
tags:
  - persistence
  - sample
  - postgis
  - search
relations:
  - type: depends_on
    target: kysely-dbal
  - type: depends_on
    target: location-material-gate
  - type: depends_on
    target: sample-parentage
status: stable
---

A sample has at most one location, stored as columns on a shared `location` table (`location_type` plus coordinates), referenced from `sample.location_id` (nullable, no cascade).

- The location moved off `sample` and onto its own table so a sub-sample can point at its parent's row and inherit its location with no propagation; see [[sample-parentage]] and ADR 0014's fourth amendment. Only the owning sample may write the row it points at; a child refuses the write.
- PostGIS is enabled from the first migration (`CREATE EXTENSION IF NOT EXISTS postgis`), so `postgis/postgis:17-3.5` is required in dev, e2e and the api vitest config. RDS ships PostGIS on its allowlist.
- **Raw coordinate columns are the CRUD source of truth**: `double precision` (`point_longitude`, `point_latitude`, four `area_*` edges, the line endpoints) round-tripping as JS `number`, preserving what was entered. A generated, GiST-indexed `geom` column (`location_geom_gist`) derives the search geometry; the app never reads or writes it.
- **`geometry` (planar), not `geography`**: a drawn search box has constant-latitude edges, which a geodesic edge bows away from, silently excluding samples inside the drawn rectangle and inverting past 180° of width. The price is explicit antimeridian splitting, paid in both places: the generated column splits a stored crossing area (`west > east`) into an `ST_Collect` of two envelopes, and `withinBbox` (`api/src/sample/service/list-sample.ts`) splits a crossing search box into an OR of two envelopes from `splitBbox` in `domain`. That OR must carry its own parentheses, the filter list being joined with AND. A distance-in-metres query would cast `geom::geography` at the call site.

Domain model (`domain/sample/location/`), `sample.location` nullable and its parts independent and optional, so a locality-only location is valid:

- `position?`: a `z.discriminatedUnion("type")` over `point` (longitude, latitude), `area` (west/east/south/north) and `line` (start/end pairs), each with an optional vertical block.
- The vertical block is a non-negative value in metres with a required `reference` (elevation, depth below ground, depth below sea floor, bathymetry, core depth, other) and an optional EPSG reference `system` (17 values); the sign lives in `reference`. A point carries one value, an area a `min`/`max`, a line a `start`/`end`. Bounds are plain `z.number()`, decimals accepted.
- `region?`: `{ kind: "continent", country }` or `{ kind: "ocean", oceanSea }`; plus `navigationType?`, `localityName?`, `localityDescription?`.
- Cross-field coherence (`north >= south`, vertical `min <= max`) is a `superRefine` on `locationSchema`.
- Vocabularies stay codes: ISO 3166-1 alpha-2 countries localized by native `Intl.DisplayNames` with an English fallback for retired entries, a bespoke `snake_case` ocean/sea list with a generated label map, SESAR navigation types stored verbatim since the acronym is language-neutral.
- A sample is read with a correlated `jsonObjectFrom` subquery on `location` (`sampleLocationQuery`), never a join; the bbox filter is a correlated `exists` on `location`. The repository selects explicit columns and maps the nested row to `Location`.
- Orphan rows (no `sample.location_id` pointing at them any more) are swept by `service/delete-orphan-locations.ts`.
- Whether a location is allowed at all is [[location-material-gate]]; map search is [[map-search-leaflet]].
