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
identifier, and is used where a stored IGSN is read or looked up (`sampleSchema`,
the `GET /samples/:igsn` param). Minting a new IGSN is unchanged and still emits
the strict format (`generateIgsnSuffix`), so `igsnSuffixSchema` stays strict.

**Publish completeness is bypassed on import.** Rows are inserted as `published`
with their IGSN directly, validated only for data validity (`createSampleSchema`),
never against the publish-blocker bar. Legacy data predates the new required
fields; a row missing them is still a real published sample.

**The import is idempotent.** `scripts/import-legacy.ts` reads the dump from a
throwaway `legacy_import` database (loaded by `make db-import-legacy`, dropped
after) and upserts on `igsn`, so a rerun updates in place, preserving the row's
`id` and `created_at`.

### Field mapping (legacy -> new)

| legacy                                                 | new                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `name`                                                 | `name`                                                                                       |
| `resourceIdentifier`                                   | `igsn` (+ `published`)                                                                       |
| `latitude`/`longitude` (+`End`)                        | `location.position` (point, or area when the `*End` corner differs)                          |
| `elevation`/`elevationEnd`/`elevationUnit`             | `location.position.elevation` (positive, above datum)                                        |
| `bathy`/`bathyUnit`                                    | `location.position.elevation` (negative, `datum: msl`); used when land elevation is absent   |
| `country`                                              | `location.region` continent, name -> ISO2                                                    |
| `navigationType`                                       | `location.navigationType` (kept only if it matches a SESAR code)                             |
| `localityDescription`/`location`/`locationDescription` | `location.localityName` / `localityDescription`                                              |
| `collectionStartDate`/`collectionEndDate`              | `description.collectionDate`                                                                 |
| `size`/`sizeUnit`                                      | `description.length` (+`width`/`thickness` for an `AxBxC` value)                             |
| `resourceComment`                                      | `description.openDescription`                                                                |
| `classification`                                       | `material` ltree (slugged, rock families prefixed `rock.`, kept to its longest valid prefix) |
| `material`                                             | `material` root, only when there is no `classification`                                      |
| `collectionMethod`                                     | `collection_method` ltree (slugged)                                                          |
| `collectionMethodDesc`                                 | `collection_method_description`                                                              |
| `resourceType`                                         | `type` ltree, or `nature` for the physical-form values                                       |
| `otherNames`                                           | `specific_name`                                                                              |
| `collector` (+inline ORCID)                            | `scientificContext.collectorName` / `collectorOrcid`                                         |
| `cruiseFieldPrgm` / `fieldName` / `purpose`            | `scientificContext.researchCampaign` / `fieldName` / `missionDescription`                    |
| geological age columns                                 | `age.*` (numeric range + unit, lithostratigraphic unit)                                      |

Vocabulary values are slugged (CamelCase/`>` -> snake_case/`.`) and kept only if
the resulting path exists in the domain tree, taking the longest valid prefix;
unmappable values are dropped and tallied. `nature` (required, with no legacy
source) defaults to `inapplicable`.

**The material path must match the start of a supported path.** A sample is
imported only when its slugged material path is a valid node in the new tree,
i.e. the start (prefix) of some complete supported path, incomplete or not; or a
coarse `material_id` root (`Rock`/`Sediment`/`Mineral`) when the source knew no
finer type. A source that is genuinely coarse (a bare `Metamorphic` ->
`rock.metamorphic`, or `Igneous>Plutonic`) imports, since its path is a valid
prefix. Everything else is skipped:

- an unplaceable classification (a root the tree lacks: `Xenolithic`, `Ore`);
- a classification whose segment sequence the tree does not support, because the
  leaf sits elsewhere (`Metamorphic>Gneiss` -> `rock.metamorphic.gneiss`, but
  `gneiss` is not a direct child of `metamorphic`), or the term is spelled
  differently (`Sedimentary>Siliciclastic`), or is absent;
- a `material_id` with no matching root (`Soil`, `Ice`, `Biology`, `Liquid`,
  `Air`, `Other`), or no material signal at all.

Truncating to a coarser path would assert a classification the source did not,
and publishing an under-classified sample is worse than waiting. Skipped samples
are imported later once the material tree or this script's slug mapping supports
the path; the import is idempotent (upsert on `igsn`), so a re-import brings them
in without duplicates.

### Dropped fields (no target in the new schema)

`currentArchive` / `originalArchive` and their contacts, `collectorDetail`
(email), `coredresource` depth, `physiographicFeature`, `platform*`,
`landingPage`, `relatedresource` (not DOI links), the legacy geological-age stage
codes, old users/auth, and sub-sample parent links.

### Ignored samples (not imported)

- Private rows (`isPublic = false`, ~2,620): would otherwise be published.
- Sub-samples (`parentIgsn_id` set, ~7,717): no hierarchy in the new schema.
- Rows with an empty identifier (~6): nothing to store as the IGSN.
- Rows without a fully-known material (~7,700): see "A fully-known material".
- Rows that fail `createSampleSchema` on parse: logged and counted at runtime.

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
