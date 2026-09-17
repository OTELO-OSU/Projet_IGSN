# DataCite 4.7 as a second `/service` read format

Status: **implemented**. `GET /service/samples` and `GET /service/samples/:igsn` (ADR [0042](adr/0042-format-negotiation-on-the-service-api.md)) emit a DataCite 4.7 record when the caller's `Accept` header asks for one, alongside the default IGSN Sample Core record (`docs/igsn-core-mapping.md`).

Source: `Mapping_implementation_IGSN-Core_v0.10.0_v-Finale.docx`, section 2 (`mapCoreToDataCite`). The two other adapters it also contracts (OMS, iSamples Core) are out of scope here.

The mapping lives in `packages/domain/src/sample/datacite/`, pure and I/O-free:

- `datacite-schema.ts`: `dataCiteSampleSchema` / `DataCiteSample`, the `DATACITE_MEDIA_TYPE` and `DATACITE_SCHEMA_VERSION` constants.
- `to-datacite-sample.ts` (`toDataCiteSample`): the top-level assembly.
- `to-datacite-agents.ts`, `to-datacite-dates.ts`, `to-datacite-geolocations.ts`, `to-datacite-funding.ts`: the four non-trivial sections.

**Core is the pivot mapped, never `Sample`.** `toDataCiteSample` takes a `CoreSample`, so the call is `toDataCiteSample(toCoreSample(sample, frontendUrl))`. `toCoreSample` (`packages/domain/src/sample/core/to-core-sample.ts`) stays the single place converting a `Sample` to Core; a DataCite deviation never reopens it.

## Media type

- `application/vnd.otelo.datacite+json` on the two `/service` GET routes.
- A Core record (`application/json`) is the default: an `Accept` of `application/json`, `application/*`, `*/*` or no header at all serves Core.
- An unserved `Accept` answers `406`.

## Sensitive-location masking

`rightsAndAccess.sensitiveLocation` (always `false` today) keeps its meaning: when `true`, `geoLocations[]` carries `geoLocationPlace` alone, `geoLocationPoint` / `geoLocationBox` dropped.

## Mapping table

Ordered by the Core schema, top to bottom, so it reads in the direction the code runs and every Core field is accounted for.

| Core source                                                                               | DataCite target                   | Rule                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                                                                           | none                              | DataCite names its own kernel, see the constant row                                                                                                                                                       |
| `record.recordId`                                                                         | `alternateIdentifiers[]`          | `{ alternateIdentifier, alternateIdentifierType: "UUID" }`                                                                                                                                                |
| `record.createdAt`                                                                        | none                              | already carried by `dates[Created]`                                                                                                                                                                       |
| `record.updatedAt`                                                                        | none                              | already carried by `dates[Updated]`                                                                                                                                                                       |
| `record.metadataLanguage[0]`                                                              | `language`                        | defaults to `"en"`                                                                                                                                                                                        |
| `record.metadataVersion`                                                                  | none                              | Core's own version, meaningless to DataCite                                                                                                                                                               |
| `record.lifecycleEvents[]`                                                                | `dates[]`                         | `created->Created`, `validated->Valid`, `registered->Issued`, `published->Available`, `updated->Updated`, `withdrawn->Withdrawn`, `tombstone` skipped (see Deviations)                                    |
| `identification.sampleIdentifier`                                                         | `doi`                             | DataCite's mandatory identifier, which the contract's table leaves implicit                                                                                                                               |
| `identification.landingPage`                                                              | `url`                             | direct                                                                                                                                                                                                    |
| `identification.titles[]`                                                                 | `titles[]`                        | `{ title: value }`; `titleType` dropped, ours is always `Main`                                                                                                                                            |
| `identification.localName`                                                                | none                              | omitted on purpose, see below                                                                                                                                                                             |
| `classification.natureOfSample`                                                           | none                              | omitted on purpose, see below                                                                                                                                                                             |
| `classification.sampleObjectTypes[0]`                                                     | none                              | omitted on purpose, see below                                                                                                                                                                             |
| `classification.materialCategories[0]`                                                    | `types.resourceType`              | the `.label`, the head material                                                                                                                                                                           |
| `classification.contextCategories[]`                                                      | `subjects[]`                      | `{ subject: label, subjectScheme: schemeName, schemeUri: schemeURI }`                                                                                                                                     |
| `responsibility[Creator]`                                                                 | `creators[]`                      | `{ name, nameType, nameIdentifiers?, affiliation? }`                                                                                                                                                      |
| `responsibility[Registrant]`                                                              | `publisher`                       | the fixed OTELo constant, never the agent's own name                                                                                                                                                      |
| `responsibility[Collector, ChiefScientist, HostingInstitution, Curator, Researcher]`      | `contributors[]`                  | same agent shape plus `contributorType`: `DataCollector`, `ProjectLeader`, `HostingInstitution`, `DataCurator`, `Researcher`                                                                              |
| `publication.publisher`                                                                   | `publisher`                       | `{ name: "OTELo", publisherIdentifier: OTELO_ROR_URI, publisherIdentifierScheme: "ROR", schemeUri: "https://ror.org" }`                                                                                   |
| `publication.publicationYear`                                                             | `publicationYear`                 | direct                                                                                                                                                                                                    |
| `production.collection_date_start`/`_end`                                                 | `dates[Collected]`                | the start alone when both are equal, `"start/end"` otherwise                                                                                                                                              |
| `production.collectionDatePrecision`, `.collectionDateTimeZone`                           | none                              | a DataCite date is a plain string                                                                                                                                                                         |
| `production.collectionMethod`, `.collectionMethodDescription`                             | none                              | contract routes them to OMS `sam:samplingMethod` and omits them here on purpose                                                                                                                           |
| `production.samplingPurpose`                                                              | `descriptions[]`                  | `descriptionType: "Abstract"`                                                                                                                                                                             |
| `production.samplingSite_name`                                                            | none                              | omitted on purpose, see below                                                                                                                                                                             |
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
| `rightsAndAccess.sensitiveLocation`                                                       | `geoLocations[]`                  | the masking switch above, not a field of its own                                                                                                                                                          |
| `manualGroups`                                                                            | none                              | our own grouping, no DataCite slot                                                                                                                                                                        |
| `extensions.*`                                                                            | none                              | explicitly excluded by the contract                                                                                                                                                                       |
| constant                                                                                  | `types.resourceTypeGeneral`       | `"PhysicalObject"`                                                                                                                                                                                        |
| constant                                                                                  | `schemaVersion`                   | `"http://datacite.org/schema/kernel-4"`                                                                                                                                                                   |

`nameType` is `Personal` / `Organizational` from `agent.agentType`. `nameIdentifiers` and `affiliation[].affiliationIdentifier` are emitted only for an `https://orcid.org/` or `https://ror.org/` id; our `urn:otelo:osu:` / `urn:otelo:laboratory:` affiliations carry a name alone.

A round-trip-style guard (`to-datacite-sample.spec.ts`) lists every Core path as projected or deliberately dropped, so a new Core field fails the suite until it is placed in one list or the other.

## Deviations from the contract document

### Rows our Core cannot feed

- No `identification.descriptions[]`, no `keywords[]`, no `identification.alternateIdentifiers[]`: `descriptions[]` comes from the two additive rows alone, `subjects[]` from `contextCategories[]` alone, `alternateIdentifiers[]` from `record.recordId` alone.
- Every Core relation carries a `targetIdentifier`, so `relatedItems[]` is never emitted.
- A Core title has no language, so `titles[].lang` is omitted; `language` carries the record language.
- A Core concept has no `conceptURI`, so `subjects[].valueUri` is omitted.
- The "`HostingInstitution` derived from the Creator" row is not applied: our Core carries real `HostingInstitution` roles and they map straight through.
- Contract section 6 (`assertProjectable`) is not implemented: a Core record is only ever produced from a published sample, which already satisfied `samplePublishBlockers`, and `publisher` is the fixed OTELo constant, so both assertions are true by construction.

### Deviations worth a line each

- `lifecycleEvents.tombstone` maps to no DataCite `dateType` and is skipped; the contract's table lists only the other six event types.
- `fundingReferences[].funderName` is optional here though DataCite requires it, because its only source, `production.projects[0].name`, is optional.
- The `Accept` negotiation also serves a Core record for `application/*`, beyond the three media types the contract discussed.

### Core fields the contract omits on purpose

The contract maps the DataCite properties the record needs and leaves the rest of DataCite's optional vocabulary out. These Core fields are dropped by design, not by oversight, and call for no decision of ours:

- `identification.localName`, which `titles[] { titleType: "AlternativeTitle" }` could have held.
- `classification.natureOfSample` and `classification.sampleObjectTypes[0]`, which the contract sends to OMS `sf:specimenType` alone.
- `production.samplingSite_name`, a second candidate for `geoLocationPlace` alongside `placeNames[0]` and `locationDescription`.
- `production.collectionMethodDescription`, which `descriptions[] { descriptionType: "Methods" }` could have held.
