# 14. Sample location: PostGIS-native storage and model

## Status

Accepted

## Context

A sample needs a geographic **location**: a point or an area, with optional
elevation/bathymetry, a continent/country or ocean/sea region, a marine
navigation type, and free-text locality name and description. There is at most
one location per sample.

Searching samples by an **area drawn on a map** is a near-term requirement, so
the store must be spatially indexable from the first migration, with no later
migration or refactor to enable search. The registry runs on Postgres (ADR
0002), accessed through Kysely (ADR 0001), with `domain` as the single source of
truth for schemas.

## Decision

**A separate 1:1 `location` table**, keyed by `sample_id`
(`REFERENCES sample(id) ON DELETE CASCADE`). A row exists only when a sample has
some location data. This keeps the `sample` table narrow and gives the geography
column and its index a natural home.

**PostGIS from day one.** An `enable-postgis` migration runs
`CREATE EXTENSION IF NOT EXISTS postgis` (mirroring the `ltree`/`unaccent`
pattern), ordered before `create-location`.

**Raw coordinate columns are the CRUD source of truth; the searchable geometry
is derived.** Coordinates are `double precision` columns (`point_longitude`,
`point_latitude`, and four `area_*` edges) that round-trip as JS `number`
through postgres.js, display trivially in the form, and preserve the entered
values faithfully. A generated, GiST-indexed column derives the search geometry
from them, so the app never reads or writes it and search is a later additive
`WHERE` clause:

```sql
geom geography(Geometry, 4326) GENERATED ALWAYS AS (
  CASE type
    WHEN 'point' THEN ST_SetSRID(ST_MakePoint(point_longitude, point_latitude), 4326)::geography
    WHEN 'area'  THEN ST_MakeEnvelope(area_west_longitude, area_south_latitude,
                                      area_east_longitude, area_north_latitude, 4326)::geography
    ELSE NULL
  END
) STORED;
-- CREATE INDEX location_geom_gist ON location USING gist (geom);
```

**`geography`, not `geometry`.** Geography joins points along the shorter
great-circle arc, so it handles antimeridian-crossing areas natively (its
bounding box and GiST index are dateline-aware); even when `west > east`,
`ST_MakeEnvelope(...)::geography` keeps the correct ≤180° interior with no
split logic. The one geography constraint, a polygon may not span more than 180°
of longitude, is unreachable by a real sample area.

**Domain model** (`domain/sample/location/`): `sample.location` is nullable;
when present its parts are independent and optional. `type` (point vs area)
governs only the coordinate block; locality, region and navigation type stand
alone (a locality-only location is valid).

```
location = {
  position?:  { type:"point", longitude, latitude, elevation?:{ min, max, unit, datum } }
            | { type:"area",  westLongitude, eastLongitude, southLatitude, northLatitude,
                              elevation?:{ min, max, unit, datum } }
  region?:    { kind:"continent", country } | { kind:"ocean", oceanSea }
  navigationType?
  localityName?
  localityDescription?
}
```

`position` is a `z.discriminatedUnion("type", ...)`, itself optional. Elevation
attaches to the position as a signed integer range in whole units (positive
elevation above the datum, negative bathymetry below), with a shared `unit` and
`datum` required once present; a point is the degenerate range where
`min === max`, and the form asks for a single value. Stored in two `integer`
columns (`elevation_min`/`elevation_max`): a native range type is unsound here
because the unit varies per row. Cross-field coherence (`north >= south`,
elevation `min <= max`) lives in a `superRefine` on `locationSchema`.

**Vocabularies** stay codes per the i18n rule:

- **Country**: ISO 3166-1 alpha-2 codes, localized by native `Intl.DisplayNames`
  (no ~240-key label map, no dependency), with an English fallback for the few
  retired/non-ISO entries CLDR cannot resolve.
- **Ocean/sea**: a bespoke `snake_case` coded list plus a generated i18n label
  map (no ISO standard exists), following the texture-label pattern.
- **Navigation type**: the SESAR values stored verbatim; language-neutral
  acronyms, so the label is the code, no map.
- **Elevation unit** (`m`/`km`) and **vertical datum** (`msl`/`wgs84`/`grs80`):
  small enums; the datum has a translated label map.

**Material-driven requirement.** A single predicate
`locationRequirement(material)` is the source of truth, consumed by the admin
form (tab visibility), `createSampleSchema` (forbidden case), and
`samplePublishBlockers` (required case):

| Material                                     | Requirement                                               | Enforcement                                                                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `synthetic_rock_mineral`                     | **forbidden** (location derived from the structure ROR)   | admin hides the Location tab; API rejects a non-null location in `createSampleSchema.superRefine`                                                                          |
| `extraterrestrial_rock.returned_samples[.*]` | **optional**                                              | no publish blocker                                                                                                                                                         |
| everything else                              | **position required** (a point or area), gated at publish | new `publishBlockerSchema` code `location_position_missing`, pushed by `samplePublishBlockers`; the admin label map is exhaustive, so it fails to compile until translated |
| `null` (unclassified draft)                  | treated as optional                                       | `material_missing` already blocks publish                                                                                                                                  |

## Alternatives rejected

- **Single `jsonb` column**: no GiST spatial index is possible on data inside a
  `jsonb` value, so map search would force a separate derived geometry column
  anyway; also opaque to Kysely and cast-per-predicate.
- **Composite type**: shares the `jsonb` spatial flaw (the coordinate is a
  sub-attribute, not an indexable column) and has no Kysely support (custom
  driver de/serialization, raw SQL per predicate).
- **Native `point`/`box`**: postgres.js 3.4.9 has no parser for the geometric
  types, so they round-trip as strings needing custom serde on every read/write;
  `box` also normalizes corners and cannot represent a dateline-crossing area.
- **`geometry` (planar) instead of `geography`**: fast and richer in operators,
  but the antimeridian needs manual splitting at 180° into a MultiPolygon on both
  stored areas and the drawn box. Geography removes that for a negligible cost at
  this scale.
- **Storing only the geometry (no raw columns)**: would force `ST_X`/`ST_Y`/
  `ST_XMin...` extraction on every CRUD read and geometry serde on write, and
  lose the faithful dateline intent. Raw columns keep CRUD in plain numbers.
- **Location columns on `sample`**: doubles the table width and puts a spatial
  index on the list-hot table; a 1:1 table isolates both.
- **A `location_id` FK on `sample` (pointing sample at location)**: reverses the
  ownership. `ON DELETE CASCADE` would then orphan the location row when a sample
  is deleted (cascade removes the referencing row, not the referenced one), the
  1:1 would need an added `UNIQUE(location_id)` rather than coming free from a
  PK, location would need its own surrogate id, and writing would take two
  ordered statements (insert location, update sample) instead of one upsert keyed
  by `sample_id`. The `location.sample_id` shared primary key is the standard
  shape for an optional, owned 1:1. A `location_id` on the owner is right only
  when location is a shared, independent lookup referenced by many rows, which it
  is not (one location per sample).

## Consequences

- **Infrastructure**: PostGIS needs an image change from `postgres:17-alpine` to
  `postgis/postgis:17-3.5` (Debian-based, so larger) in
  `packages/api/vitest.config.ts` (the `@kysely-vitest/postgres` test container),
  `docker-compose.dev.yml`, and `docker-compose.e2e.yml`. RDS ships PostGIS on
  its extension allowlist, so the `enable-postgis` migration works in preprod.
- **Kysely**: no `geography` type, so `db.ts` types `geom` as
  `Generated<string>`, never selected. The repository selects explicit columns
  and maps flat rows to the nested `Location` (`LEFT JOIN` on read; upsert on
  write, delete the row when location is null). Spatial predicates use `sql`
  fragments.
- The generated column relies on `ST_MakePoint`, `ST_SetSRID`, `ST_MakeEnvelope`
  and the `::geography` cast all being `IMMUTABLE`. Validated by the first
  integration test on the real PostGIS container; the fallback is a
  `BEFORE INSERT/UPDATE` trigger.
- `Sample` stays one type carrying `location: Location | null` (the list joins
  the 1:1); split only if list performance ever demands it.
- **Search** (later, additive, no migration): `listSamplesQuerySchema` gains an
  optional bounding-box param; the repository adds
  `geom && ST_MakeEnvelope(:w,:s,:e,:n,4326)::geography AND ST_Intersects(geom, ...)`;
  the drawn box lives in the URL. A map-draw control is a further phase and pulls
  in a map-library dependency decision.
- **Admin**: a Location tab in the sample form, hidden when the material makes
  location forbidden; a `NumberField` is added to the design-system form kit for
  the coordinate inputs.
- Tests run against real PostGIS via `@kysely-vitest/postgres` on the postgis
  image; `make test-e2e` needs the postgis image in the e2e compose.
