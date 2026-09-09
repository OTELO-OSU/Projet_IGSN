# 0014. Sample location: PostGIS-native storage and model

## Status

Accepted, amended four times: the 1:1 `location` table became columns on `sample` (`type` renamed `location_type`), `geom` became planar `geometry` instead of `geography`, the position union gained a third `line` shape with the signed elevation range replaced by a non-negative vertical block, and the columns moved back off `sample` into a shared `location` table (2026-09-08, sub-samples). The live definition is the latest migration in `packages/api/migrations/`. The PostGIS, planar-geometry and raw-coordinate decisions stand unchanged.

## Context

A sample needs a geographic location: a point, an area, or a line between two endpoints, with an optional vertical position, a continent/country or ocean/sea region, a marine navigation type, and free-text locality name and description. There is at most one location per sample.

Searching samples by an area drawn on a map was a near-term requirement, so the store had to be spatially indexable from the first migration, with no later migration or refactor to enable search.

## Decision

**PostGIS from day one.** An `enable-postgis` migration runs `CREATE EXTENSION IF NOT EXISTS postgis`, mirroring the `ltree`/`unaccent` pattern.

**The columns live on a shared `location` table again (amended 2026-09-08).** They moved onto `sample` because the location used to be always read and written with its own sample. Sub-samples broke that: a sub-sample inherits its parent's location (`allowsLocation(parent.material)`), so the location became a shared lookup after all, exactly the case this ADR's own rejected alternative named. The columns moved back to a `location` table, this time keyed by an app-generated `id` and referenced from `sample.location_id` (nullable, no cascade), never a join, only a correlated `jsonObjectFrom` subquery (`sampleLocationQuery`) and a correlated `exists` for the bbox filter.

- **Shared-row inheritance**: a child's `sample.location_id` points straight at its parent's `location` row, so a parent's location edit is visible to every descendant with no propagation step, and `service/delete-orphan-locations.ts` sweeps a row no `sample.location_id` points to any more.
- **Blast radius**: every sibling and descendant of the owning sample shares that one row, so only the owning sample may write it; `service/write-sample-location.ts` refuses to write it for a sample that has a parent.
- **Rejected: copying the parent's values into the child's own row.** Two rows would then claim one truth, kept equal only by app code on every future write path (the parent's, the child's, a grandchild's); one shared row cannot drift by construction.
- **Rejected: a generated column deriving the child's location from its parent.** A Postgres generated column may reference only its own row, so it cannot reach across to a parent's.

**Raw coordinate columns are the CRUD source of truth; the searchable geometry is derived.** Coordinates are `double precision` columns (`point_longitude`, `point_latitude`, and four `area_*` edges) that round-trip as JS `number` through postgres.js, display trivially in the form, and preserve the entered values faithfully. A generated, GiST-indexed `geom` column (`location_geom_gist`) derives the search geometry from them, so the app never reads or writes it.

**`geometry` (planar), not `geography`.** Geodesic edges were the original choice, because great-circle arcs handle an antimeridian-crossing area natively with no split logic. That is true, and measured to be true, but the same edges are wrong for a search box, whose edges are lines of constant latitude, not geodesics. A geodesic edge bows poleward, so a wide box silently excludes samples inside the rectangle the user drew: with box `-100,40,10,60`, points in Spain, southern France, the mid-Atlantic and Kansas all failed to match. Worse, past 180° of width the match inverts, box `-170,0,170,20` matching only lon 179, which is outside it, because geography reads the polygon as the ≤180° complement. A stored area never reaches 180° of width, but a drawn search box reaches it in one gesture.

Planar geometry matches what the map draws, a Leaflet rectangle on Web Mercator being exactly a constant-latitude box. The price is explicit splitting at 180, paid in both places: the generated column splits a stored crossing area (`west > east`) into an `ST_Collect` of two envelopes, and `withinBbox` (`api/src/sample/service/list-sample.ts`) splits a crossing search box into an OR of two envelopes, from `splitBbox` in `domain`, wrapped in a correlated `exists` against `location` since the geometry no longer sits on `sample`. A distance-in-metres query, if one is ever needed, casts `geom::geography` at the call site.

**Domain model** (`domain/sample/location/`): `sample.location` is nullable, and when present its parts are independent and optional. `location_type` (point vs area vs line) governs only the coordinate block; locality, region and navigation type stand alone, so a locality-only location is valid.

```
location = {
  position?:  { type:"point", longitude, latitude, vertical?:{ position, reference, system } }
            | { type:"area",  westLongitude, eastLongitude, southLatitude, northLatitude,
                              vertical?:{ min, max, reference, system } }
            | { type:"line",  startLongitude, startLatitude, endLongitude, endLatitude,
                              vertical?:{ start, end, reference, system } }
  region?:    { kind:"continent", country } | { kind:"ocean", oceanSea }
  navigationType?
  localityName?
  localityDescription?
}
```

`position` is an optional `z.discriminatedUnion("type", ...)`. The vertical block is always a non-negative value in metres, with a shared `reference` (elevation, depth below ground, depth below sea floor, bathymetry, core depth, other) required once present and an optional reference `system` (amended 2026-08-31); the sign that used to live on the value now lives in `reference`. A point carries a single `position`, an area a `min`/`max` range, a line a `start`/`end` pair. Bounds are plain `z.number()`, decimals accepted since readings are not always whole units (amended 2026-08-05), stored in `double precision` columns, a native range type being unsound when the reference system varies per row. Cross-field coherence (`north >= south`, vertical `min <= max`) lives in a `superRefine` on `locationSchema`.

**Vocabularies stay codes** per the i18n rule: ISO 3166-1 alpha-2 countries localized by native `Intl.DisplayNames` (no ~240-key label map, no dependency) with an English fallback for retired entries CLDR cannot resolve; a bespoke `snake_case` ocean/sea list with a generated label map, no ISO standard existing; SESAR navigation types stored verbatim, being language-neutral acronyms, so the label is the code; a small enum for the vertical reference (elevation, depth below ground, depth below sea floor, bathymetry, core depth, other); and a 17-value EPSG vertical reference system enum, replacing the earlier 3-value vertical datum. `msl` is kept as a code for compatibility with existing rows; the earlier `wgs84`/`grs80` fold to `unknown`.

**Material-driven gate.** A single predicate `allowsLocation(material)` (`domain/sample/location/allows-location.ts`) is the source of truth, consumed by the admin form (Location tab visibility), `createSampleSchema` (rejecting a location it forbids) and `samplePublishBlockers` (requiring one where it applies).

| Material                                                               | Allowed | Enforcement                                                                                  |
| ---------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `synthetic_rock_mineral`, `extraterrestrial_rock.returned_samples[.*]` | **no**  | admin hides the Location tab; the api rejects a non-null location in `createSampleSchema`    |
| everything else, including no material chosen yet                      | **yes** | **position required**, a point, area or line, gated at publish (`location_position_missing`) |

ADR 0016 amended this: the location now shows by default and hides only for a refused material, replacing the earlier default-hidden, material-required scheme and its `undetermined`/`optional` states.

## Alternatives rejected

- **A single `jsonb` column** or **a composite type**: no GiST index is possible on a coordinate that is a sub-attribute, so map search would need a derived geometry column anyway, and both are opaque to Kysely.
- **Native `point`/`box`**: postgres.js has no parser for the geometric types, so they round-trip as strings needing custom serde; `box` also normalizes corners and cannot represent a dateline-crossing area.
- **Storing only the geometry**: would force `ST_X`/`ST_Y`/`ST_XMin` extraction on every CRUD read and geometry serde on write, and lose the faithful dateline intent.

## Consequences

- **Infrastructure**: PostGIS needs `postgis/postgis:17-3.5` rather than `postgres:17-alpine` in `packages/api/vitest.config.ts`, `docker-compose.dev.yml` and `docker-compose.e2e.yml`. RDS ships PostGIS on its extension allowlist.
- **Kysely** has no geometry type, so `db.ts` types `geom` as `Generated<string>`, never selected. The repository reads a sample with `selectAll("sample")` plus a correlated `location` subquery selecting its explicit columns, and maps the nested row to `Location`; spatial predicates use `sql` fragments.
- The generated column relies on `ST_MakePoint`, `ST_SetSRID`, `ST_MakeEnvelope` and `ST_Collect` being `IMMUTABLE`, validated by the integration tests on the real container; the fallback is a `BEFORE INSERT/UPDATE` trigger. A generated column's type cannot be altered in place (`USING` is rejected outright), so changing it means `DROP` plus re-`ADD`, which is safe only because `geom` derives from the raw columns.
- **Search**: `listSamplesQuerySchema` carries an optional bounding-box param and the drawn box lives in the URL. The OR of two envelopes must carry its own parentheses, since the filter list is joined with `AND` and an unparenthesised OR would escape the visibility scope.
- `Sample` stays one type carrying `location: Location | null`; split only if list performance ever demands it.
