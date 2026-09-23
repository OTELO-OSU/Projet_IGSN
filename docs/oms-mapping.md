# OGC-OMS / SOSA as a fourth `/service` read format

Status: **implemented**. `GET /service/samples` and `GET /service/samples/:igsn` (ADR [0042](adr/0042-format-negotiation-on-the-service-api.md)) emit an OGC-OMS / SOSA GeoJSON feature when the caller's `Accept` header asks for one, alongside the default IGSN Sample Core record (`docs/igsn-core-mapping.md`), the DataCite 4.7 record (`docs/datacite-mapping.md`) and the iSamples Core 2.0 record (`docs/isamples-mapping.md`).

Source: `Mapping_implementation_IGSN-Core_v0.10.0_v-Finale.docx`, section 3, and the [SOSA feature register](https://opengeospatial.github.io/ogcapi-sosa/build/register.json) this format follows.

The mapping lives in `packages/domain/src/sample/oms/`, pure and I/O-free:

- `oms-schema.ts`: `OMS_MEDIA_TYPE`, the `OMS_SAMPLE_CONTEXT` / `OMS_SAMPLE_COLLECTION_CONTEXT` JSON-LD context URIs, `omsSampleSchema` / `OmsSample`, `omsSampleCollectionSchema` / `OmsSampleCollection`, and the internal context-less `omsFeatureSchema` a collection embeds.
- `to-oms-sample.ts`: `toOmsSample(core)`, `toOmsSampleCollection(cores, total)`.
- `to-oms-sampling.ts`: `toOmsSampling` (the `isResultOf` sampling event) and `toOmsPreparationSteps`.

**Core is the pivot mapped, never `Sample`.** `toOmsSample` takes a `CoreSample`, so the call is `toOmsSample(toCoreSample(sample, frontendUrl))`. `toCoreSample` (`packages/domain/src/sample/core/to-core-sample.ts`) stays the single place converting a `Sample` to Core; an OMS deviation never reopens it. `oms-schema.ts` reuses `coreGeometrySchema` and `coreVerticalCoordinateSchema` from `core-production-schema.ts` rather than redeclaring them, so geometry and vertical extent have one source of truth across Core and OMS.

## Media type

- `application/vnd.otelo.oms+json` on the two `/service` GET routes, the fourth media type after Core, DataCite and iSamples.
- A Core record (`application/json`) is the default: an `Accept` of `application/json`, `application/*`, `*/*` or no header at all serves Core.
- An unserved `Accept` answers `406`.
- `POST` and `PUT` ignore `Accept` and always answer an IGSN Core record, the format switch being a read concern.
- Both GET routes publish `Accept` as a documented header parameter, so `/service/docs` offers all four formats and `/service/openapi.json` carries a schema for each.

## Record shape

One sample is a GeoJSON `Feature` carrying a `sosa:Sample` `featureType` and its own `@context`:

```json
{
  "@context": "https://opengeospatial.github.io/ogcapi-sosa/build/annotated/sosa/features/sample/context.jsonld",
  "@id": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  "type": "Feature",
  "featureType": "sosa:Sample",
  "geometry": { "type": "Point", "coordinates": [6.18, 48.69] },
  "properties": {
    "sampleIdentifier": "ABCDEFGHJKMNPQRSTVWXYZ0123",
    "...": "..."
  }
}
```

A page is a GeoJSON `FeatureCollection` carrying a `sosa:SampleCollection` `featureType` and its own `@context`; each embedded feature carries no `@context` of its own, since a JSON-LD `@context` applies to the whole document it sits at the root of:

```json
{
  "@context": "https://opengeospatial.github.io/ogcapi-sosa/build/annotated/sosa/features/sampleCollection/context.jsonld",
  "type": "FeatureCollection",
  "featureType": "sosa:SampleCollection",
  "numberMatched": 7,
  "numberReturned": 2,
  "features": [
    {
      "@id": "...",
      "type": "Feature",
      "featureType": "sosa:Sample",
      "geometry": null,
      "properties": { "...": "..." }
    }
  ]
}
```

## Mapping table

Ordered by the Core schema, top to bottom, so every Core field is accounted for. Checked against `packages/domain/src/sample/oms/to-oms-sample.ts` and `to-oms-sampling.ts`.

| Core source                                                   | OMS target                                                     | Rule                                                                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                                               | none                                                           | OMS names its own context, see the `@context` constants                                                                         |
| `record.*`                                                    | none                                                           | no OMS slot; the format answers "where, when, how, from what, by whom", not lifecycle bookkeeping                               |
| `identification.sampleIdentifier`                             | `properties.sampleIdentifier`                                  | direct                                                                                                                          |
| `identification.landingPage`                                  | `@id`                                                          | direct, the sample's public page                                                                                                |
| `identification.doi`                                          | none                                                           | `@id` is the landing page and `sampleIdentifier` the IGSN; the DOI itself has no slot                                           |
| `identification.titles[] { titleType: "Main" }.value`         | `properties.name`                                              | read by title type, not index, since a local id may add a second title; falls back to `""` when absent                          |
| `identification.localName`                                    | `properties.localName`                                         | direct, optional                                                                                                                |
| `classification.natureOfSample`, `.sampleObjectTypes[0]`      | `properties.specimenType[]`                                    | `[natureOfSample, sampleObjectTypes[0]]`, the two concepts as one array (`sf:specimenType`)                                     |
| `classification.materialCategories[0]`                        | `properties.materialCategory`                                  | direct, one concept                                                                                                             |
| `classification.contextCategories[]`                          | `properties.contextCategory[]`                                 | direct, the whole list unfiltered                                                                                               |
| `responsibility[Collector].agent`                             | `properties.isResultOf.madeBySampler`                          | `{ "@id"?: agent.id, name }`, `name` via `joinContactName` for a Person or the organization name; absent with no Collector      |
| `responsibility` (other roles)                                | none                                                           | the format names one sampler, not every role                                                                                    |
| `publication.*`                                               | none                                                           | no OMS slot                                                                                                                     |
| `production.collection_date_start`/`_end`                     | `properties.isResultOf.startTime`/`.endTime`                   | direct, `YYYY-MM-DD` at day precision or `YYYY-MM-DDTHH:mm` at hour precision, whatever Core already carries; not a `date-time` |
| `production.collectionDatePrecision`                          | `properties.isResultOf.timePrecision`                          | direct, an OTELo extra as in Core                                                                                               |
| `production.collectionDateTimeZone`                           | `properties.isResultOf.timeZone`                               | direct, an OTELo extra as in Core; present iff hour precision                                                                   |
| `production.collectionMethod`, `.collectionMethodDescription` | `properties.isResultOf.usedProcedure`, `.procedureDescription` | direct (`sam:samplingMethod`)                                                                                                   |
| `production.samplingPurpose`                                  | `properties.isResultOf.description`                            | direct                                                                                                                          |
| `production.samplingSite_name`                                | `properties.isResultOf.hasFeatureOfInterest`                   | direct                                                                                                                          |
| `production.projects[]`                                       | none                                                           | no OMS slot                                                                                                                     |
| `production.processSteps[]`                                   | `properties.preparationStep[]`                                 | `{ stepType, startTime, endTime, timePrecision, timeZone, description }` per step, in Core order (`sam:preparationStep`)        |
| `production.location.geometry`                                | `geometry`                                                     | passed through unchanged, Core already produces GeoJSON; `null` with no location                                                |
| `production.location.placeNames[0]`                           | `properties.placeName`                                         | direct, optional                                                                                                                |
| `production.location.locationDescription`                     | `properties.locationDescription`                               | direct, optional                                                                                                                |
| `production.location.verticalExtent`                          | `properties.verticalExtent`                                    | direct, same shape as Core's (`minimum`/`maximum`), optional                                                                    |
| `production.location.countryCodes[0]`                         | `properties.countryCode`                                       | direct, optional                                                                                                                |
| `production.location.oceanOrSea`                              | `properties.oceanOrSea`                                        | direct, optional                                                                                                                |
| `production.location.navigationMethod`                        | `properties.navigationMethod`                                  | direct, optional                                                                                                                |
| `production.location.crs`                                     | none                                                           | a GeoJSON geometry is CRS84 by definition                                                                                       |
| `physicalDescription.*`                                       | none                                                           | no OMS slot; the format names where and how the sample was taken, not what it physically is                                     |
| `relations[relationType=IsDerivedFrom]`                       | `properties.hasOriginalSample[]`                               | `targetURI` of each parent relation (`parentIgsnOf`), one entry per parent                                                      |
| `relations` (other fields, other relation types)              | none                                                           | no OMS slot                                                                                                                     |
| `curation.*`                                                  | none                                                           | no OMS slot                                                                                                                     |
| `rightsAndAccess.rightsURIs[0]`                               | `properties.rightsURI`                                         | direct, optional                                                                                                                |
| `rightsAndAccess.metadataVisibility`                          | none                                                           | always `public` here                                                                                                            |
| `rightsAndAccess.sensitiveLocation`                           | none                                                           | not honoured; `geometry` is always emitted verbatim (see Deviations)                                                            |
| `manualGroups[]`                                              | none                                                           | our own grouping, no OMS slot                                                                                                   |
| `extensions.*`                                                | none                                                           | no OMS slot                                                                                                                     |
| constant                                                      | `type`                                                         | `"Feature"` / `"FeatureCollection"`                                                                                             |
| constant                                                      | `featureType`                                                  | `"sosa:Sample"` / `"sosa:SampleCollection"`                                                                                     |
| constant                                                      | `@context`                                                     | `OMS_SAMPLE_CONTEXT` / `OMS_SAMPLE_COLLECTION_CONTEXT`                                                                          |

A round-trip-style guard (`to-oms-sample.spec.ts`) lists every Core path as projected or deliberately dropped, so a new Core field fails the suite until it is placed in one list or the other.

## Deviations

From the register and the contract document:

- `hasOriginalSample` is an array although the register types it `["object", "string"]`, since a sample carries up to two parents and an `@id` term is multi-valued in RDF.
- `startTime` / `endTime` carry `YYYY-MM-DD` at day precision, not a `date-time`; `timePrecision` and `timeZone` are OTELo extras, as in Core.
- `isSampleOf` is never emitted, the registry recording no feature-of-interest resource.
- The SOSA shortcuts `isResultOfMadeBySampler` and `isResultOfUsedProcedure` are not emitted, `isResultOf` carrying both.
- The linked SOSA `@context` declares no term of ours, so every non-SOSA property (`sampleIdentifier`, `localName`, `materialCategory`, `hasOriginalSample`, `rightsURI`, and the rest of `properties`) is dropped by a JSON-LD reader.
- No `"@type": "sosa:Sampling"` inside `isResultOf`.
- The list is a `FeatureCollection`, not the `{ data, meta: { total } }` envelope the other three formats keep; `numberMatched` and `numberReturned` carry the pagination, per OGC API Features. See ADR [0042](adr/0042-format-negotiation-on-the-service-api.md).

Found by reviewers, and each worth its own line:

- **`rightsAndAccess.sensitiveLocation` masking is not honoured.** DataCite and iSamples mask coordinates when it is true; OMS emits `geometry` verbatim. This is safe only because `to-core-sample.ts` hardcodes the flag to `false`. The day the flag becomes settable, OMS leaks a masked location, and the drift guard will not catch it: the field sits in the dropped list above and stays "dropped" once it becomes real. Revisit this mapping before `sensitiveLocation` is ever writable.
- `identification.doi` is dropped: `@id` is the landing page and `sampleIdentifier` the IGSN.
- No api fixture carries a `verticalExtent`, so that sub-schema is exercised on the route only as absent; its values are covered by the domain spec (`to-oms-sample.spec.ts`).
