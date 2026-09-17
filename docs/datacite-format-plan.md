# DataCite 4.7 as a second read format on `/service`

## Context

`/service` is the registry's only public machine contract (ADR 0036) and it speaks one format: IGSN Sample Core v0.10.0 (ADR 0040), declared in OpenAPI (ADR 0041). Core is our own pivot shape; `Mapping_implementation_IGSN-Core_v0.10.0_v-Finale.docx` is the signed contract projecting it onto three standard targets (DataCite 4.7, OGC O&M/OMS, iSamples Core).

Integrators that already consume DataCite cannot read Core. This change makes the two `/service` GET routes serve a DataCite 4.7 record when the caller asks for one, leaving Core the default. O&M/OMS and iSamples are out of scope; the shape chosen here must not make them harder to add later.

Decisions already taken with the PO:

- Only `GET /service/samples` and `GET /service/samples/{igsn}`. The public `/samples` routes keep their internal shape.
- The media type is `application/vnd.otelo.datacite+json`: RFC 6838 section 3.2 puts a format nobody registered in the vendor tree, under the producer's own name, with the `+json` structured suffix of section 4.2.8. The sibling adapters will follow the same shape (`application/vnd.otelo.oms+json`, `application/vnd.otelo.isamples+json`).
- The DataCite list keeps the Core envelope, `{ data: [...], meta: { total } }`.
- An `Accept` we do not serve answers `406`, never a silent fallback.
- Emit `doi` (the mapping table names only `url`; a record must say which sample it describes).
- Our LineString track and our closed-rectangle Polygon both map to `geoLocationBox`.

## Approach

Map **Core -> DataCite**, not `Sample` -> DataCite. The contract document is written that way (`mapCoreToDataCite`), `toCoreSample` stays the single `Sample` mapping (ADR 0040), and the two remaining adapters plug in the same place.

```
toDataCiteSample(toCoreSample(sample, frontendUrl))
```

## Domain: `packages/domain/src/sample/datacite/`

New folder, one concern per file, no barrel.

- `datacite-schema.ts`: `dataCiteSampleSchema` / `DataCiteSample`, plus `DATACITE_MEDIA_TYPE = "application/vnd.otelo.datacite+json"` and `DATACITE_SCHEMA_VERSION = "http://datacite.org/schema/kernel-4"`. Give the schema `.meta({ id: "DataCiteSample", description })` like its Core twin, and a `description` on **every** property, nested ones included: `openapi.spec.ts` walks `components.schemas` recursively and fails on the first one missing. Keep every regex flag-free, the same spec rejects a `pattern` carrying flags.
- `to-datacite-sample.ts`: `toDataCiteSample(core: CoreSample): DataCiteSample`, the top-level assembly, delegating the four non-trivial sections.
- `to-datacite-agents.ts`: `creators[]` / `contributors[]`, the `CoreRole -> contributorType` map, `nameIdentifiers` and `affiliation`.
- `to-datacite-dates.ts`: `lifecycleEvents[] -> dates[]` plus the `Collected` entry.
- `to-datacite-geolocations.ts`: `production.location -> geoLocations[]`, including the masking rule.
- `to-datacite-funding.ts`: `production.projects[0] -> fundingReferences[]`.

Add `dataCiteListSamplesResponseSchema` next to its Core twin in `packages/domain/src/service-account/service-sample-validator.ts`, which already holds `coreListSamplesResponseSchema`.

### Mapping table

Ordered by the Core schema, top to bottom, so the table reads in the direction the code runs and every Core field is accounted for. Walk `core-sample-schema.ts` against it when reviewing.

| Core source                                                                               | DataCite target                   | Rule                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                                                                           | none                              | DataCite names its own kernel, see the constant row                                                                                                                                                       |
| `record.recordId`                                                                         | `alternateIdentifiers[]`          | `{ alternateIdentifier, alternateIdentifierType: "UUID" }`                                                                                                                                                |
| `record.createdAt`                                                                        | none                              | already carried by `dates[Created]`                                                                                                                                                                       |
| `record.updatedAt`                                                                        | none                              | already carried by `dates[Updated]`                                                                                                                                                                       |
| `record.metadataLanguage[0]`                                                              | `language`                        | defaults to `"en"`                                                                                                                                                                                        |
| `record.metadataVersion`                                                                  | none                              | Core's own version, meaningless to DataCite                                                                                                                                                               |
| `record.lifecycleEvents[]`                                                                | `dates[]`                         | `created->Created`, `validated->Valid`, `registered->Issued`, `published->Available`, `updated->Updated`, `withdrawn->Withdrawn`                                                                          |
| `identification.sampleIdentifier`                                                         | `doi`                             | direct                                                                                                                                                                                                    |
| `identification.landingPage`                                                              | `url`                             | direct                                                                                                                                                                                                    |
| `identification.titles[]`                                                                 | `titles[]`                        | `{ title: value }`; `titleType` dropped, ours is always `Main`                                                                                                                                            |
| `identification.localName`                                                                | none                              | open gap, see below                                                                                                                                                                                       |
| `classification.natureOfSample`                                                           | none                              | open gap, see below                                                                                                                                                                                       |
| `classification.sampleObjectTypes[0]`                                                     | none                              | open gap, see below                                                                                                                                                                                       |
| `classification.materialCategories[0]`                                                    | `types.resourceType`              | the `.label`, the head material                                                                                                                                                                           |
| `classification.contextCategories[]`                                                      | `subjects[]`                      | `{ subject: label, subjectScheme: schemeName, schemeUri: schemeURI }`                                                                                                                                     |
| `responsibility[Creator]`                                                                 | `creators[]`                      | `{ name, nameType, nameIdentifiers?, affiliation? }`                                                                                                                                                      |
| `responsibility[Registrant]`                                                              | `publisher`                       | the fixed OTELo constant, never the agent's own name                                                                                                                                                      |
| `responsibility[Collector, ChiefScientist, HostingInstitution, Curator, Researcher]`      | `contributors[]`                  | same agent shape plus `contributorType`: `DataCollector`, `ProjectLeader`, `HostingInstitution`, `DataCurator`, `Researcher`                                                                              |
| `publication.publisher`                                                                   | `publisher`                       | `{ name: "OTELo", publisherIdentifier: OTELO_ROR_URI, publisherIdentifierScheme: "ROR", schemeUri: "https://ror.org" }`                                                                                   |
| `publication.publicationYear`                                                             | `publicationYear`                 | direct                                                                                                                                                                                                    |
| `production.collection_date_start/_end`                                                   | `dates[Collected]`                | the start alone when both are equal, `"start/end"` otherwise                                                                                                                                              |
| `production.collectionDatePrecision`, `.collectionDateTimeZone`                           | none                              | a DataCite date is a plain string                                                                                                                                                                         |
| `production.collectionMethod`, `.collectionMethodDescription`                             | none                              | contract routes them to OMS `sam:samplingMethod`                                                                                                                                                          |
| `production.samplingPurpose`                                                              | `descriptions[]`                  | `descriptionType: "Abstract"`                                                                                                                                                                             |
| `production.samplingSite_name`                                                            | none                              | open gap, see below                                                                                                                                                                                       |
| `production.projects[0]`                                                                  | `fundingReferences[]`             | one entry per `fundingReferences[]`; `funderName <- project.name`, `funderIdentifier <- value`, `funderIdentifierType: "ROR"`, `awardNumber <- project.funding`                                           |
| `production.projects[0].campaign`, `.description`                                         | none                              | no DataCite slot                                                                                                                                                                                          |
| `production.processSteps[]`                                                               | none                              | contract routes them to OMS `sam:preparationStep`                                                                                                                                                         |
| `production.location.geometry`                                                            | `geoLocations[]`                  | `Point -> geoLocationPoint`; `LineString` and `Polygon -> geoLocationBox`                                                                                                                                 |
| `production.location.placeNames[0]`, `.locationDescription`                               | `geoLocations[].geoLocationPlace` | the place name, falling back to the description                                                                                                                                                           |
| `production.location.crs`                                                                 | none                              | a DataCite geolocation is WGS84 by definition, and ours is always CRS84                                                                                                                                   |
| `production.location.verticalExtent`, `.navigationMethod`, `.countryCodes`, `.oceanOrSea` | none                              | no DataCite slot                                                                                                                                                                                          |
| `physicalDescription.orientation`                                                         | none                              | explicitly excluded by the contract                                                                                                                                                                       |
| `physicalDescription.openPhysicalDescription`                                             | `descriptions[]`                  | `descriptionType: "Other"`                                                                                                                                                                                |
| `physicalDescription.mass`, `.volume`, `.dimensions.*`                                    | `sizes[]`                         | `"<value> <unitCode>"`, the UCUM code the quantity already carries                                                                                                                                        |
| `relations[]`                                                                             | `relatedIdentifiers[]`            | `{ relatedIdentifier: targetIdentifier.value, relatedIdentifierType: targetIdentifier.identifierType, relationType, resourceTypeGeneral: targetResourceType }`; a parent already rides as `IsDerivedFrom` |
| `curation.*`                                                                              | none                              | explicitly excluded by the contract                                                                                                                                                                       |
| `rightsAndAccess.rightsURIs[0]`                                                           | `rightsList[]`                    | `{ rights: "Creative Commons Attribution 4.0 International", rightsUri, rightsIdentifier: "CC-BY-4.0", rightsIdentifierScheme: "SPDX" }`                                                                  |
| `rightsAndAccess.metadataVisibility`                                                      | none                              | always `public` here                                                                                                                                                                                      |
| `rightsAndAccess.sensitiveLocation`                                                       | `geoLocations[]`                  | the masking switch below, not a field of its own                                                                                                                                                          |
| `manualGroups`                                                                            | none                              | our own grouping, no DataCite slot                                                                                                                                                                        |
| `extensions.*`                                                                            | none                              | explicitly excluded by the contract                                                                                                                                                                       |
| constant                                                                                  | `types.resourceTypeGeneral`       | `"PhysicalObject"`                                                                                                                                                                                        |
| constant                                                                                  | `schemaVersion`                   | `"http://datacite.org/schema/kernel-4"`                                                                                                                                                                   |

`nameType` is `Personal` / `Organizational` from `agent.agentType`. `nameIdentifiers` and `affiliation[].affiliationIdentifier` are emitted only for an `https://orcid.org/` or `https://ror.org/` id; our `urn:otelo:osu:` / `urn:otelo:laboratory:` affiliations carry a name alone.

Mirror this table in a round-trip-style guard: a spec listing the Core paths projected and the Core paths deliberately dropped, so a new Core field fails the suite until it is placed in one list or the other. `core-round-trip.spec.ts` already does exactly this for `Sample` with `UNMAPPED_SAMPLE_FIELDS`; copy the shape rather than inventing one.

### Sensitive-location masking (contract section 5)

`rightsAndAccess.sensitiveLocation` is always `false` today, but implement the rule so the Core field keeps its meaning: when it is `true`, emit `geoLocationPlace` alone and drop `geoLocationPoint` / `geoLocationBox`. It is one guard in `to-datacite-geolocations.ts`.

### Contract rows our Core cannot feed

The contract names source paths our Core does not have. Record these, do not invent fields:

- No `identification.descriptions[]`, no `keywords[]`, no `identification.alternateIdentifiers[]`: `descriptions[]` comes from the two additive rows alone, `subjects[]` from `contextCategories[]` alone, `alternateIdentifiers[]` from `record.recordId` alone.
- Every Core relation carries a `targetIdentifier`, so `relatedItems[]` is never emitted.
- A Core title has no language, so `titles[].lang` is omitted; `language` carries the record language.
- A Core concept has no `conceptURI`, so `subjects[].valueUri` is omitted.
- The "`HostingInstitution` derived from the Creator" row is not applied: our Core carries real `HostingInstitution` roles and they map straight through.
- Contract section 6 (`assertProjectable`) is not implemented: a Core record is only ever produced from a published sample, which already satisfied `samplePublishBlockers`, and `publisher` is the fixed OTELo constant, so both assertions are true by construction.

### Open gaps to raise, implemented as the contract says

Four Core fields carry real data the contract routes nowhere in DataCite. Follow the contract, drop them, and list them in `docs/datacite-mapping.md` as questions for its authors rather than deviating on our own:

- `identification.localName`, which `titles[] { titleType: "AlternativeTitle" }` would hold.
- `classification.natureOfSample` and `classification.sampleObjectTypes[0]`, which are concepts `subjects[]` would hold; the contract sends both to OMS `sf:specimenType` only.
- `production.samplingSite_name`, a second candidate for `geoLocationPlace`.
- `production.collectionMethodDescription`, which `descriptions[] { descriptionType: "Methods" }` would hold.

## API: `packages/api/src/service-account/`

No hand-rolled `Accept` parser: Hono ships `accepts` from `hono/accepts`. Its stock matcher cannot express a 406 (it falls back to `default`), so pass a `match` returning `""` when nothing is supported.

- `service-route-definitions.ts`: a `negotiated(core, dataCite, description)` helper beside the existing `json()`, declaring both media types under the `200` of `listSamplesRoute` and `getSampleRoute`, plus a `406` built from the existing `serviceErrorSchema`.
- `service-routes.ts`: a small `negotiate(c)` wrapping `accepts` with `supports: ["*/*", "application/json", DATACITE_MEDIA_TYPE]`, `default: "*/*"` and a q-descending `match`. Both GET handlers check it **first** and return `c.json({ error: "Not acceptable" }, 406)` on `""`, then answer `c.json(dataCiteBody, 200, { "content-type": DATACITE_MEDIA_TYPE })` or the unchanged Core `c.json(body, 200)`.

Two verified facts to build on: a lowercase `"content-type"` in the third argument of `c.json` does override Hono's own `application/json`, and `c.body(...)` does **not** typecheck under `app.openapi` once a response declares `content`. Both declared media types infer as `"json"`, so the handler's return type is a union and the compiler cannot bind a body to its media type: the header assertion in the tests is the only thing that catches a mismatch.

`Accept: application/json;q=0` is not honoured as "explicitly unacceptable"; mark that ceiling with a `ponytail:` comment rather than writing a full RFC 9110 parser.

Nothing changes on `POST` / `PUT`: the request body stays Core-only. A malformed query or IGSN still answers 400 from the `defaultHook`, and a bad api key still 403, both before negotiation runs.

## Tests

Domain, `to-datacite-sample.spec.ts`, driven by the existing `core-sample-fixture.ts` through `toCoreSample`:

- one whole-value `toEqual` on the field sample and one on the synthetic sample;
- the `Collected` date rule, instant vs period;
- each geometry shape to its DataCite geolocation;
- a sensitive location keeping the place and dropping the coordinates.

Plus the coverage guard described above, listing every Core path as projected or deliberately dropped, so a new Core field fails until it is placed.

No test per role or per event type: those are `Record` maps the whole-value assertions already exercise, and `testing.md` rules out enumerating a declared mapping.

API, in `service-routes.spec.ts` (`pgTest`, `app.request` with a `Bearer` header, as the file already does):

- `GET /service/samples` with the DataCite `Accept` returns the envelope, the DataCite `Content-Type` and a body parsing under `dataCiteListSamplesResponseSchema`;
- `GET /service/samples/{igsn}` likewise, parsing under `dataCiteSampleSchema`;
- an unserved `Accept` returns `406`.

Assert `res.headers.get("content-type")` in each, not the body alone: the types cannot bind a body to its media type, so the header is the only guard against emitting Core under the DataCite type.

`openapi.spec.ts` must stay green unchanged: it walks `components.schemas` recursively for missing descriptions and the whole document for flagged patterns, and its "every mounted route is documented" guard is untouched since no path is added.

## Docs

- `docs/datacite-mapping.md`: the implemented mapping and the deviations above, shaped like `docs/igsn-core-mapping.md`.
- `docs/adr/0042-format-negotiation-on-the-service-api.md`: a second emitted format on the public machine contract is a public-contract decision. Record the Core-as-pivot choice, the RFC 6838 vendor-tree media type and the naming it sets for the two adapters still to come, the `406`-over-fallback choice, and the Core envelope for the DataCite list. `0041` is taken twice already, so `0042` is the next free number. Note that the media type carries no version: the record's own `schemaVersion` names the DataCite kernel, so a future 4.8 does not mint a second media type.

## Verification

1. `pnpm test --project @projet-igsn/domain packages/domain/src/sample/datacite`
2. `pnpm test --project @projet-igsn/api packages/api/src/service-account`
3. `pnpm lint:check` (the type gate) and `pnpm fmt:check`
4. `make dev`, then with a service-account key:
   - `curl -H "Authorization: Bearer $KEY" localhost:3000/api/service/samples` still returns Core;
   - the same with `-H "Accept: application/vnd.otelo.datacite+json"` returns DataCite with that `Content-Type`;
   - the same with `-H "Accept: text/csv"` returns `406`;
   - `localhost:3000/api/service/docs` lists both media types on the two GET routes.
5. `make test-e2e` (api runtime change, per `testing.md`).
