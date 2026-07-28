# 0018. Importing the legacy IGSN dump

Date: 2026-07-24

## Status

Accepted.

## Context

The previous registry (a Django app) holds ~24,910 geological samples, each with
an already-assigned, citable IGSN (`CNRS##########` or `TOAE##########`). Its
`pg_dump` (`bdd-igsn.sql`, gitignored) must land in the new database so those
samples are browsable alongside newly-declared ones.

The two schemas differ sharply. The old side is one wide `igsn_resource` table
plus many lookup tables; the new side is `sample` with vocabularies stored as
domain codes/ltree paths validated by Zod, no users, no sub-sample hierarchy.
Two facts force decisions that constrain the code:

- The new `igsn` column normally holds a 26-char Crockford base32 suffix derived
  from the sample UUID (`generateIgsnSuffix`); a legacy IGSN does not fit that
  format.
- A sample is publishable only when it clears every publish blocker (nature,
  complete material/type paths, location, collection date, availability,
  provenance...). Most legacy rows are too sparse to qualify.

## Decision

**Legacy IGSNs are real IGSNs.** The old `resourceIdentifier` is stored verbatim
in `sample.igsn`, and the sample is `published`, treated no differently from a
natively-minted one. No separate `legacy_igsn` column.

**Validation is lax on read, strict on mint.** `igsnSchema`
(`domain/igsn/model.ts`) accepts either a minted 26-char suffix or a legacy
identifier (`CNRS`/`TOAE` + a 10-digit number), and is used where a stored IGSN
is read or looked up (`sampleSchema`, the `GET /samples/:igsn` param). The import
validates each identifier with the same schema before storing it, so a stored
IGSN is always one the read path can look up. Minting a new IGSN is unchanged and
still emits the strict format (`generateIgsnSuffix`), so `igsnSuffixSchema` stays
strict.

**Publish completeness is bypassed on import.** Rows are inserted as `published`
with their IGSN directly, validated only for data validity (`createSampleSchema`),
never against the publish-blocker bar. Legacy data predates the new required
fields; a row missing them is still a real published sample.

**The import is idempotent.** `scripts/import-legacy.ts` reads the dump from a
throwaway `legacy_import` database (loaded by `make db-import-legacy`, dropped
after) and upserts on `igsn`, so a rerun updates in place, preserving the row's
`id` and `created_at`.

### Field mapping (legacy -> new)

| legacy                                                 | new                                                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                                                 | `name`                                                                                                                                                                               |
| `resourceIdentifier`                                   | `igsn` (+ `published`)                                                                                                                                                               |
| `latitude`/`longitude` (+`End`)                        | `location.position` (point, or area when the `*End` corner differs)                                                                                                                  |
| `elevation`/`elevationEnd`/`elevationUnit`             | `location.position.elevation` (positive, above datum)                                                                                                                                |
| `bathy`/`bathyUnit`                                    | `location.position.elevation` (negative, `datum: msl`); used when land elevation is absent                                                                                           |
| `country`                                              | `location.region` continent, name -> ISO2                                                                                                                                            |
| `navigationType`                                       | `location.navigationType` (kept only if it matches a SESAR code)                                                                                                                     |
| `localityDescription`/`location`/`locationDescription` | `location.localityName` / `localityDescription`                                                                                                                                      |
| `collectionStartDate`/`collectionEndDate`              | `description.collectionDate`                                                                                                                                                         |
| `size`/`sizeUnit`                                      | an `AxBxC` triple maps to `length`/`width`/`thickness` in that order; a single number fills all three; `/` is no value; anything else skips the row                                  |
| `resourceComment`                                      | `description.openDescription`                                                                                                                                                        |
| `classification`                                       | `material` ltree (slugged, rock families prefixed `rock.`, kept to its longest valid prefix)                                                                                         |
| `material`                                             | `material` root, only when there is no `classification`                                                                                                                              |
| `collectionMethod`                                     | `collection_method` ltree (slugged)                                                                                                                                                  |
| `collectionMethodDesc`                                 | `collection_method_description`                                                                                                                                                      |
| `resourceType`                                         | `type` ltree, or `nature` for the physical-form values                                                                                                                               |
| `otherNames`                                           | `specific_name`                                                                                                                                                                      |
| `collector` (+inline ORCID)                            | `scientificContext.collectorName` / `collectorOrcid`; accepts a name, `Surname, Firstname`, an organization, a `;`-list, or a trailing `(ORCID: ...)`; any other shape skips the row |
| `cruiseFieldPrgm` / `fieldName` / `purpose`            | `scientificContext.researchCampaign` / `fieldName` / `missionDescription`                                                                                                            |
| geological age columns                                 | `age.*` (numeric range + unit, lithostratigraphic unit)                                                                                                                              |

Vocabulary values are slugged (CamelCase/`>` -> snake_case/`.`) and kept only if
the resulting path exists in the domain tree, taking the longest valid prefix.
`nature` (required, with no legacy source) defaults to `inapplicable`, so a
resource type that maps to neither a known type path nor a physical-form nature
counts as unplaceable.

**A value we cannot place skips the whole sample.** Every field the import feeds
through one of our enums / controlled lists (material, collection method,
resource type, country, navigation type, and the size / elevation / age units)
either normalizes into that enum or the sample is skipped: we never store a value
outside the enum (it would defeat the enum) and never publish a sample that
silently lost it. The `size` value follows the same rule: an `AxBxC` triple maps
to length/width/thickness in that order, a single number fills all three
dimensions (the source does not say which one it is), `/` is no value, and
anything else (a two-value pair, free text) skips. `unmappableValues` (in
`import-legacy-mapping.ts`) returns every offending value in a row; the import
prints each skip (IGSN, reason, offending value) to stdout, which
`make db-import-legacy` tees to `import-legacy.log`, so the gaps to close before
a re-import are visible. Skipped rows come back on a re-import once the mapping
supports the value (upsert on `igsn`, so no duplicates).

**The material path must match the start of a supported path.** A sample is
imported only when its slugged material path is a valid node in the new tree,
i.e. the start (prefix) of some complete supported path, incomplete or not; or a
coarse `material_id` root (`Rock`/`Sediment`/`Mineral`) when the source knew no
finer type. A source that is genuinely coarse (a bare `Metamorphic` ->
`rock.metamorphic`, or `Igneous>Plutonic`) imports, since its path is a valid
prefix. Everything else is skipped:

A legacy metamorphic or sedimentary leaf whose node sits elsewhere in the new
tree (`Metamorphic>Gneiss` -> `rock.metamorphic.strongly_metamorphosed.gneiss`)
or is spelled differently (`Sedimentary>Siliciclastic` ->
`...siliciclastic_sedimentary_rock`) is remapped by hand: `MATERIAL_SPECIALS`
in the import script keys each rooted slug to the path the geologist's mapping
instructions assign it (mirrored on the "Material remaps" tab of
`docs/legacy-import-mapping.xlsx`). Everything else is skipped:

- an unplaceable classification (a root the tree lacks: `Xenolithic`, `Ore`);
- a classification whose segment sequence the tree does not support and that
  `MATERIAL_SPECIALS` does not remap, including the values the expert table
  leaves marked "record to review" (`Metamorphic>MechanicallyBroken`,
  `Meta-Carbonate`, `Meta-Ultramafic`);
- a `material_id` with no matching root (`Soil`, `Ice`, `Biology`, `Liquid`,
  `Air`, `Other`), or no material signal at all.

Truncating to a coarser path would assert a classification the source did not,
and publishing an under-classified sample is worse than waiting. Skipped samples
are imported later once the material tree or this script's slug mapping supports
the path; the import is idempotent (upsert on `igsn`), so a re-import brings them
in without duplicates.

### Dropped fields (no target in the new schema)

`currentArchive` / `originalArchive` and their contacts, `collectorDetail`
(email), `physiographicFeature_id` / `physiographicFeatureName`,
`collectionDatePrecision` / `collectionTime` / `collectionTimeEnd` (the new
collection date is date-only), `platform*` and `launch*`, `landingPage`,
`prefix_id` (already inside `resourceIdentifier`), and the
`relatedresource` / `relationtype` (not DOI links), `coredresource` (interval
depths), `personne`, `alternateidentifier`, `logdate` and `geologicalage`
stage-code tables, plus old users/auth and sub-sample parent links.
`docs/legacy-import-mapping.xlsx` lists them column by column with the reason.

### Ignored samples (not imported)

- Private rows (`isPublic = false`, ~2,620): would otherwise be published.
- Sub-samples (`parentIgsn_id` set, ~7,717): no hierarchy in the new schema.
  Every skip below is printed to stdout (IGSN, reason, offending value) and tee'd
  to `import-legacy.log` by `make db-import-legacy`:

- Rows with an empty identifier (~6): nothing to store as the IGSN.
- Rows whose identifier is not a well-formed IGSN (`CNRS`/`TOAE` + 10 digits):
  an unexpected identifier surfaces instead of becoming an unreachable published
  sample.
- Rows without a fully-known material: see "The material path must match the
  start of a supported path".
- Rows carrying a value that does not fit an enum (collection method, resource
  type, country, navigation type, a size / elevation / age unit): see "A value
  that does not fit its enum".
- Rows that fail `createSampleSchema` on parse.

## Consequences

- Published imported samples can miss fields the publish flow requires; the
  public app must tolerate a published sample with sparse data (it already
  renders every sub-block as nullable).
- IGSN validation is looser everywhere a stored IGSN is read; the strictness that
  matters (minting) is unaffected, and the DB `UNIQUE` on `igsn` still guards
  collisions (none exist in the dump).
- Reruns are safe and update in place, so the dump can be re-imported after a
  mapping fix without duplicating or renumbering samples.
- Some legacy detail is deliberately lost (see dropped fields); recovering it
  later means new columns/fields, not re-parsing the dump differently.
