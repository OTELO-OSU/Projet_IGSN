# IGSN Core v0.10.0 pivot on the `/service` API

Status: **implemented**. `GET/POST/PUT /service/samples` and `GET /service/samples/:igsn` (ADR 0036, amended by ADR 0040) emit and accept IGSN Sample Core v0.10.0 records.

Source: `IGSN-Core_v0.10.0.docx` (gitignored) and the application mapping sheet `coreMapping_applicatif_v0.10.0.xlsx` (repo root, untracked). This replaces the earlier v0.7.0 study, which listed why the pivot could not ship (no slot for provenance status, collection origin, synthesis parameters, age, hazards, collection-date precision, programme description, and a foreign status model). v0.10.0 answers every one of those points: `extensions.geology / safety / experiment`, `lifecycleEvents` as the single state model, `production.collectionMethod`, `collectionDatePrecision`/`collectionDateTimeZone`, `Project.funding`/`description`, `samplingSite_name`, OTELo ROR, UCUM units.

The mapping lives in `packages/domain/src/sample/core/`, pure and I/O-free:

- `to-core-sample.ts` (`toCoreSample`) and `from-core-sample.ts` (`fromCoreSample`) are the single place converting a `Sample` to and from a Core record.
- `core-sample-schema.ts` holds `coreSampleSchema` (emitted, tight) and `coreSampleBodySchema` (accepted).
- `core-path.ts` (`toCorePath`) translates every internal error path into its Core path.

## Principles kept from the study

- **The service API sees published samples only.** No draft, no withdrawn, no tombstone; the route forces the account's moderation scope, never a client parameter.
- **Published-only tightens the schema.** `samplePublishBlockers` guarantees a published sample has `nature`, a complete `type` and `material`, a collection date, existence/availability status, a provenance-consistent scientific context and a coalesced `publicationYear`, so those fields are required in `coreSampleSchema` rather than relaxed to optional. `currentRepository.organization` is **not** guaranteed (the v0.7.0 study was wrong there) and stays optional.
- **`coreSampleSchema` enforces our vocabularies, not a loose Core shape.** Every `Concept` is keyed on `schemeName = otelo:<scheme>` and `schemeURI = urn:otelo:vocabulary:<scheme>` (a constant per scheme, not a registry lookup), and its `id` is validated by the matching domain schema (`materialPathSchema`, `sampleTypeSchema`, `natureSchema`, `textureSchema`, and so on for every classification and condition enum). `label` is the leaf segment of a dot path (`pathSegment(id)`) and is never read back; the reverse mapper reads `id` alone.
- **Two-stage validation.** `fromCoreSample` only reshapes the body; the route then runs `createSampleSchema` / `updateSampleSchema`, so every domain refinement (branch rules, existence/availability compatibility, texture-by-material, condition completeness) stays single-sourced in `domain/sample`, never duplicated in the Core schema.
- **Strict schema.** Every object is a `strictObject`; an unmodelled field (`attachments`, `keywords`, `identification.descriptions`...) is refused with `unrecognized_keys` rather than silently dropped.
- Every internal path the routes report (blocker paths, `frozenFieldEdits` results, stage-2 zod issues) goes through `toCorePath` before it reaches the caller, so the 422/403 body always speaks Core paths.

## Concept and Quantity conventions

- **Concept** = `{ id, label, schemeName, schemeURI, notation? }`. `schemeURI = urn:otelo:vocabulary:<scheme>`, `id` is our machine code or dot path (validated by the domain schema named in each table below), `label = pathSegment(id)`. At most one concept per `(schemeName, notation)` pair in `contextCategories`.
- **Quantity** = `{ value, unitCode (UCUM), unitLabel (our code) }`. The reverse mapper reads `unitLabel` and restores `{ value, unit }`; `unitCode` exists for a Core-side consumer and is never read back. `kbar -> bar` (x1e3) and `gpa -> Pa` (x1e9) scale the value by decimal exponent so the round trip is exact.
- **emit only** = server-owned; present in every reply, ignored or refused in a body.
- **required** = the pivot schema requires it because a publish blocker guarantees it on a published sample.

## Field-by-field mapping

Our field paths are leaves of `sampleSchema` (`packages/domain/src/sample/sample.ts`).

The field descriptions of the published `/service` OpenAPI spec (ADR [0041](adr/0041-openapi-for-the-service-api.md)) live on each field's own `.meta({ description })` in `packages/domain/src/sample/core/`, not here.
The "Comment" column is mapping notes, written for a reviewer of the mapping rather than for an integrator.

### Root and identification

| Our field      | Core field                                                                       | Comment                                                                |
| -------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| (constant)     | `schemaVersion`                                                                  | `"0.10.0"`                                                             |
| `id`           | `record.recordId`                                                                | `urn:uuid:<id>`; emit only                                             |
| `createdAt`    | `record.createdAt`, `record.lifecycleEvents[eventType=created].timestamp`        | emit only                                                              |
| `publishedAt`  | `record.lifecycleEvents[eventType=published].timestamp`                          | new column, set on first mint; emit only                               |
| `updatedAt`    | `record.updatedAt`, `record.lifecycleEvents[eventType=updated].timestamp`        | `updated` event only when `updatedAt > publishedAt`; emit only         |
| `status`       | `record.lifecycleEvents[].eventType`                                             | always `published` on this API, no `registered`/`validated`; emit only |
| (constant)     | `record.metadataLanguage`                                                        | `["en"]`                                                               |
| (constant)     | `record.metadataVersion`                                                         | `"0.10.0"`                                                             |
| `igsn`         | `identification.sampleIdentifier`                                                | raw IGSN (26-char suffix or legacy handle); required; emit only        |
| `igsn`         | `identification.landingPage`                                                     | `<FRONTEND_URL>samples/<igsn>`; required; emit only                    |
| `name`         | `identification.titles[0].value`                                                 | `titleType: "Main"`; exactly one title                                 |
| `specificName` | `identification.localName`                                                       |                                                                        |
| (none)         | `identification.alternateIdentifiers`, `identification.descriptions`, `keywords` | not emitted; refused in a body (`unrecognized_keys`)                   |

### Classification

| Our field                                        | Core field                                                                            | Comment                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `nature`                                         | `classification.natureOfSample`                                                       | Concept `otelo:nature-of-sample`, id validated by `natureSchema`; required                               |
| `type`                                           | `classification.sampleObjectTypes[0]`                                                 | Concept `otelo:sample-type`, id = dot path, `sampleTypeSchema`; exactly one; required                    |
| `material` (level 1)                             | `classification.materialCategories[0]`                                                | Concept `otelo:material`, id = `rock_and_sediment.<level1>`; exactly one; required                       |
| `material` (full path)                           | `classification.contextCategories[schemeName=otelo:material]`                         | id = full dot path, `materialPathSchema`; required                                                       |
| `materialOtherName`                              | `classification.contextCategories[otelo:material].notation`                           | only when `isOtherMaterial(material)`; deviation, no row in the Core sheet                               |
| `texture`                                        | `contextCategories[otelo:texture]`                                                    | `textureSchema`; branch rule (`texturesFor`) re-checked at stage 2                                       |
| `metamorphicFacies`                              | `contextCategories[otelo:metamorphic-facies]`                                         | `metamorphicFaciesSchema`                                                                                |
| `metamorphicFabric`                              | `contextCategories[otelo:metamorphic-fabric]`                                         | `metamorphicFabricSchema`                                                                                |
| `geomorphologicalEnvironment`                    | `contextCategories[otelo:geomorphologicalContext]`                                    | id = dot path, `geomorphologicalEnvironmentSchema`                                                       |
| `resourceType`                                   | `contextCategories[otelo:resource-type]`                                              | id = dot path, `resourceTypeSchema`                                                                      |
| `geologicalContextDescription`                   | `contextCategories[otelo:geologicalContext]`                                          | id = the free text itself                                                                                |
| `scientificContext.provenanceStatus`             | `contextCategories[otelo:scientificContext, notation=provenance-status]`              | id in `field_sample \| collection_specimen`; required (discriminator of the reverse `scientificContext`) |
| `scientificContext.collectionOrigin`             | `contextCategories[otelo:scientificContext, notation=collection-origin]`              | collection specimen only                                                                                 |
| `scientificContext.collectionContextDescription` | `contextCategories[otelo:scientificContext, notation=collection-context-description]` | collection specimen only                                                                                 |

### Responsibility

| Our field                                                | Core field                                        | Comment                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `owner.firstname`, `owner.name`                          | `responsibility[roles=[Creator]].agent.name`      | emit only, ignored on input (the owner is always the account's owner)                                      |
| institutional trio                                       | `responsibility[Creator].agent.affiliations[]`    | ROR / `urn:otelo:osu:<code>` / `urn:otelo:laboratory:<code>`; emit only, trio snapshotted from the account |
| (constant)                                               | `responsibility[roles=[Registrant]].agent`        | `{ name: "OTELo", id: https://ror.org/02cyw3861 }`; emit only                                              |
| `scientificContext.collectorName`/`collectorOrcid`       | `responsibility[Collector]`                       | both provenance branches                                                                                   |
| `scientificContext.chiefScientist`/`chiefScientistOrcid` | `responsibility[ChiefScientist]`                  | field sample only                                                                                          |
| `scientificContext.hostInstitution[]`                    | `responsibility[HostingInstitution]`              | one AgentRole per ROR; field sample only                                                                   |
| `scientificContext.collectionCurator`                    | `responsibility[Curator]`                         | collection specimen only                                                                                   |
| `syntheticDetails.operatorName`/`operatorOrcid`          | `responsibility[Researcher]`                      | synthetic only                                                                                             |
| `syntheticDetails.researchStructure[]`                   | `responsibility[Researcher].agent.affiliations[]` |                                                                                                            |

`roles` enum is the 7 roles above; any other Core role is a 422 `invalid_value`. At most one agent per Person role. The reverse mapper ignores Creator and Registrant.

### Publication and rights (constants but the year, emit only)

| Our field         | Core field                           | Comment                                            |
| ----------------- | ------------------------------------ | -------------------------------------------------- |
| (constant)        | `publication.publisher`              | `{ name: "OTELo", id: https://ror.org/02cyw3861 }` |
| `publicationYear` | `publication.publicationYear`        | required (coalesced on publish)                    |
| (constant)        | `rightsAndAccess.rightsURIs`         | `["https://creativecommons.org/licenses/by/4.0/"]` |
| (constant)        | `rightsAndAccess.metadataVisibility` | `"public"`                                         |
| (constant)        | `rightsAndAccess.sensitiveLocation`  | `false`                                            |

### Production (collection, programme, synthesis step)

| Our field                                                                                                    | Core field                                                  | Comment                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `description.collectionDate.start`/`.end`                                                                    | `production.collection_date_start`/`_end`                   | required                                                                                        |
| `description.collectionDate.precision`                                                                       | `production.collectionDatePrecision`                        | `day \| hour`; required                                                                         |
| `description.collectionDate.timeZone`                                                                        | `production.collectionDateTimeZone`                         | IANA name (deviation, the spec says RFC 3339); present iff `hour`                               |
| `collectionMethod`/`collectionMethodDescription`                                                             | `production.collectionMethod`/`collectionMethodDescription` | Concept `otelo:sample_description`                                                              |
| `scientificContext.missionDescription`                                                                       | `production.samplingPurpose`                                | field sample only                                                                               |
| `scientificContext.fieldName`                                                                                | `production.samplingSite_name`                              | field sample only                                                                               |
| `scientificContext.researchProgramName`, `.funderOrganizations[]`, `.funding`, `.researchProgramDescription` | `production.projects[0]`                                    | `name` optional in the pivot (deviation, Core requires it); emitted when any of the five is set |
| `scientificContext.researchCampaign`                                                                         | `production.projects[0].campaign`                           | deviation, no Core slot for a field campaign                                                    |
| `syntheticDetails.experimentalProtocol`                                                                      | `production.processSteps[0].description`                    | optional in the pivot (deviation, Core requires it)                                             |
| `syntheticDetails.synthesisDate.start`/`.end`                                                                | `production.processSteps[0].timestampStart`/`timestampEnd`  | `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`, per precision                                               |
| `syntheticDetails.synthesisDate.precision`                                                                   | `production.processSteps[0].timestampPrecision`             | `day \| hour`                                                                                   |
| `syntheticDetails.synthesisDate.timeZone`                                                                    | `production.processSteps[0].timestampTimeZone`              | IANA name (deviation, mirrors `collectionDateTimeZone`); present iff `hour`                     |
| `syntheticDetails.experimentType`                                                                            | `production.processSteps[0].method`                         | also `extensions.experiment.experimentType`; must match; reverse reads the extension            |
| (rule)                                                                                                       | `production.processSteps`                                   | one Synthesis step, emitted when any of protocol / date / type is set                           |
| `location.*`                                                                                                 | `production.location.*`                                     | see below                                                                                       |

### Location (`production.location`)

| Our field                                      | Core field                                         | Comment                                                                                                                |
| ---------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `location.position.*`                          | `geometry`                                         | Point / Polygon (5-position ring) / LineString (2 positions); west > east dateline crossing kept as written (ADR 0014) |
| (constant)                                     | `crs`                                              | `http://www.opengis.net/def/crs/OGC/1.3/CRS84`                                                                         |
| `location.position.vertical.*`                 | `verticalExtent.minimum`/`.maximum`                | point maps to `minimum` alone; unit always `"m"`                                                                       |
| `location.position.vertical.reference`         | `verticalExtent.*.reference`, `.positiveDirection` | snake to camel; `elevation -> up`, every depth reference -> `down`, `other` omitted                                    |
| `location.position.vertical.system`            | `verticalExtent.*.verticalDatum`                   | `EPSG:<code>` from `EPSG_BY_VERTICAL_SYSTEM`; `other_epsg`/`local`/`unknown` emit the code itself                      |
| `location.region.country`/`.oceanSea`          | `countryCodes[0]`/`oceanOrSea`                     | mutually exclusive                                                                                                     |
| `location.navigationType`                      | `navigationMethod`                                 | Concept `otelo:navigation-type`; requires a geometry                                                                   |
| `location.localityName`/`.localityDescription` | `placeNames[0]`/`locationDescription`              |                                                                                                                        |

Core's "at least one of geometry / verticalExtent / region" is not enforced (deviation). A sub-sample created with a sole parent must not send `location`, inherited from that parent (`location_inherited_from_parent` at `production.location`); two parents force a synthetic material, which carries no location at all.

### Physical description (`physicalDescription`)

| Our field                                        | Core field                                | Comment                        |
| ------------------------------------------------ | ----------------------------------------- | ------------------------------ |
| `description.oriented`/`.orientationExplanation` | `orientation.oriented`/`.description`     |                                |
| `description.openDescription`                    | `openPhysicalDescription`                 |                                |
| `description.length`/`.width`/`.thickness`       | `dimensions.length`/`.width`/`.thickness` | Quantity, UCUM = our code      |
| `description.mass`                               | `mass`                                    | Quantity                       |
| `description.volume`                             | `volume`                                  | Quantity, `ml -> mL`, `l -> L` |

### Curation (`curation`)

| Our field                                                                    | Core field                                                                          | Comment                                                                                                                      |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `existenceStatus`/`availabilityStatus`                                       | `existenceStatus`/`availabilityStatus`                                              | snake to camel; required; existence/availability compatibility re-checked at stage 2                                         |
| `repository.currentArchive`                                                  | `currentRepository.organization`                                                    | optional in the pivot (deviation, Core requires it)                                                                          |
| `repository.currentArchiveContactFirstname`/`.currentArchiveContactLastname` | `currentRepository.contact`                                                         | joined name; reverse splits on the first space, a single token is the last name (`ponytail:` lossy for compound first names) |
| `repository.collectionName`                                                  | `currentRepository.collectionName`                                                  |                                                                                                                              |
| `repository.originalArchive`                                                 | `originalRepository.organization.name`                                              | free text, no `id`                                                                                                           |
| `repository.originalArchiveContact*`                                         | `originalRepository.contact`                                                        | same join/split                                                                                                              |
| `condition.storageConditions[]`                                              | `sampleCondition.storageCondition[]`                                                | Concept `otelo:sample_condition`; min 1 when present                                                                         |
| `condition.temperature`/`.humidity`/`.pressure`                              | `sampleCondition.temperature`/`.humidityType`+`relativeHumidityPercent`/`.pressure` | each requires its `*_type` sibling; pressure: `kbar -> bar` (x1e3), `gpa -> Pa` (x1e9), `mmhg -> mm[Hg]`                     |
| `condition.light`/`.packaging`/`.specificConditions`                         | `sampleCondition.lightCondition`/`.packaging`/`.description`                        |                                                                                                                              |

Reading-requires-storage-condition rules stay in `conditionSchema`, applied at stage 2.

### Relations and parents (`relations[]`, `manualGroups[]`)

| Our field                                                                                                    | Core field                                                            | Comment                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `relations[].relationType`                                                                                   | `relations[].relationType`                                            | snake to PascalCase; enum = our 13                                                                                                                                                                                                                                 |
| `relations[].identifierType`/`.identifier`                                                                   | `relations[].targetIdentifier`                                        | via `identifierTypeLabel`; DOI/URL/IGSN format rules re-checked at stage 2                                                                                                                                                                                         |
| `relations[].identifier`                                                                                     | `relations[].targetURI`                                               | navigable form, DOI/URL only, emit only                                                                                                                                                                                                                            |
| `relations[].targetTitle`                                                                                    | `relations[].targetTitles[0].value`                                   | `titleType: "Main"`                                                                                                                                                                                                                                                |
| `relations[].targetResourceType`                                                                             | `relations[].targetResourceType`                                      | snake to PascalCase of our 34 DataCite values; required (blocker)                                                                                                                                                                                                  |
| `relations[].relationTypeInformation`, `.relatedMetadataScheme`, `.schemeURI`, `.schemeType`, `.description` | same names                                                            | `relatedMetadataScheme` only for `HasMetadata`, rule at stage 2                                                                                                                                                                                                    |
| `relations[].id`                                                                                             | (none)                                                                | row uuid, regenerated on write                                                                                                                                                                                                                                     |
| `parents[].igsn`                                                                                             | `relations[] { relationType: IsDerivedFrom, targetIdentifier.value }` | `identifierType: "DOI"` for a 26-char suffix, `"IGSN"` for a legacy handle. The parent is resolved by IGSN, published samples only; `parent_not_found` at `relations.<i>.targetIdentifier.value`; on PUT a changed parent is 403 `field_frozen` at `relations.<i>` |
| `parents[].name`                                                                                             | `relations[].targetTitles[0].value`                                   |                                                                                                                                                                                                                                                                    |
| (constant)                                                                                                   | parent `relations[].targetResourceType`                               | `"PhysicalObject"`                                                                                                                                                                                                                                                 |
| `manualGroups[].id`/`.name`                                                                                  | `manualGroups[].id`/`.name`                                           | reverse reads `id` -> `manualGroupIds`; `manual_group_not_attachable` at `manualGroups.<i>.id`                                                                                                                                                                     |
| `attachments[]`                                                                                              | (none)                                                                | excluded both ways; refused by the strict schema                                                                                                                                                                                                                   |

`coreSampleSchema` refuses a body carrying more than two `IsDerivedFrom` relations, the cap `createSampleSchema.parentIds` enforces again at stage 2, so the route resolves a bounded number of parents by IGSN.

### Extensions (`extensions`)

| Our field                                                                                                          | Core field                                                              | Comment                                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `age.numericAgeMin`/`.numericAgeMax`/`.numericAgeUnit`/`.numericAgeYearsUnit`                                      | `geology.numericAge.min`/`.max`/`.unit`/`.era`                          | `era`: `ce -> CE`, `bce -> BCE`, `bp -> BP`, `cal_bp -> calBP` (deviation, `calBP` is ours) |
| `age.geologicalAgeMin`/`.geologicalAgeMax`/`.geologicalUnit`                                                       | `geology.chronostratigraphy.min`/`.max`/`.unit`                         | `{ min, max, unit }` object (deviation, PO decision, see below)                             |
| `economicDepositName`/`.economicDepositDescription`/`.economicResourceTypePrecision`/`.economicInterestElements[]` | `geology.economic.*`                                                    | `interestElements` is a Concept `otelo:element` list                                        |
| `security.*`                                                                                                       | `safety.radioactivity`/`.asbestos`/`.chemical`                          | each `{ flag, explanation }`; `explanation` requires `flag: true` at stage 2                |
| `syntheticDetails.startingMaterial`/`.startingMaterialNature`/`.finalProduct`                                      | `experiment.startingMaterial`/`.startingMaterialNature`/`.finalProduct` | our enums (deviation, Core says free text)                                                  |
| `syntheticDetails.experimentType`                                                                                  | `experiment.experimentType`                                             | the value the reverse mapper reads                                                          |
| `syntheticDetails.experimentDuration`/`.temperature`/`.pressure`                                                   | `experiment.duration`/`.temperature`/`.pressure`                        | Quantity, same conversions as `sampleCondition` but a distinct field                        |
| `syntheticDetails.experimentPurpose`/`.equipmentUsed`/`.startingMaterialComposition`                               | `experiment.purpose`/`.equipment`/`.startingMaterialComposition`        |                                                                                             |
| (none)                                                                                                             | `experiment.durationNotRelevant`                                        | field dropped by migration `20260909142045`; not emitted, refused                           |

## Error-path translation

Every internal path the `/service` routes report (blocker paths from `publish-blocker-path.ts`, `frozenFieldEdits` results, stage-2 zod issues) goes through `toCorePath` (`domain/sample/core/core-path.ts`, `CORE_PATH_BY_FIELD`, longest-prefix match, trailing index kept). A path with no entry is returned unchanged (`ponytail:` ceiling, revisit if issue paths start looking wrong). Examples: `type -> classification.sampleObjectTypes.0`, `material -> classification.contextCategories`, `description.collectionDate -> production.collection_date_start`, `location -> production.location`, `existenceStatus -> curation.existenceStatus`, `scientificContext.collectorName -> responsibility`, `syntheticDetails.startingMaterial -> extensions.experiment.startingMaterial`, `manualGroupIds.0 -> manualGroups.0`. `publish-blocker-path.ts` itself is untouched; `toCorePath` is a layer on top of it.

## Deviations recorded for the Core authors

- `extensions.geology.chronostratigraphy` is `{ min: "ICS<n>", max: "ICS<n>", unit }`, a PO decision for a lossless mapping rather than a flatter shape.
- `age.numericAgeYearsUnit` includes `calBP`, which is ours and has no Core equivalent term.
- `production.collectionDateTimeZone` carries an IANA zone name; the spec calls for an RFC 3339 offset, which cannot represent a zone (DST rules).
- `production.processSteps[0].timestampPrecision`/`.timestampTimeZone` have no Core slot; same deviation as `collectionDateTimeZone`, see ADR [0041](adr/0041-synthesis-date-precision.md).
- `Concept.schemeURI` is the constant URN `urn:otelo:vocabulary:<scheme>`, not a resolvable URI.
- `Project.campaign` carries the research campaign, which Core has no slot for; dropping it would erase the field on a `GET` then `PUT` round trip.
- `responsibility[roles=[Registrant]]` is always the constant OTELo agent, so publisher matches Registrant.
- Only `created`, `published` and `updated` lifecycle events are ever emitted; no `registered` or `validated` event exists, since no DataCite registration exists.
- OSU and laboratory affiliations use our own URNs (`urn:otelo:osu:<code>`, `urn:otelo:laboratory:<code>`), since no ROR exists for either.
- `materialOtherName` rides as a `notation` on the material `contextCategories` entry; the sheet has no row for it.
- `Project.name`, `ProcessStep.description` and `currentRepository.organization` are optional in our pivot although Core requires them: none of the three is guaranteed by `samplePublishBlockers`.
- `experiment.durationNotRelevant` is never emitted and refused on input; the field was dropped from our domain by migration `20260909142045`.
- `startingMaterial`, `startingMaterialNature` and `finalProduct` carry our closed enums rather than free text.
- `relations[].targetResourceType` is the PascalCase of our 34 DataCite values, not a Core-defined list.
- `responsibility[].roles` only accepts our 7 roles (Creator, Registrant, Collector, ChiefScientist, HostingInstitution, Curator, Researcher); any other Core role is refused.
- Core's "at least one of geometry / verticalExtent / region" on `production.location` is not enforced.
- At most two `IsDerivedFrom` relations (two parents) are accepted, though Core does not itself limit it.
