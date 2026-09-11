# IGSN Core pivot mapping (not implemented)

Status: **study**. Nothing here ships yet.

`GET /service/samples` returns our internal sample shape today. This file records the mapping to the IGSN Sample Core pivot format so the open questions can go to the Core authors; the second pass implements it from their answers.

Source: `Documentation_Core_IGSN_v0.7.0.docx`, a working draft kept out of the repo (gitignored). Its own title and `schemaVersion` row say 0.4.0; we emit `0.7.0`, the filename version.

## Reading the document

Struck-through content is deleted content and is not implemented. The effective spec below comes from re-extracting the docx while ignoring every `w:strike` run, which removes far more than `representative`.

Whole structures deleted: `Title`, `LocalizedText`, `Identifier`, `SamplingSite`, `FeatureOfInterest`, `TemporalValue`, `VerticalProfilePoint`.

Fields deleted, by block:

- `MetadataRecord`: `sourceSystem`, `sourceRecordId`, `changeNote`; `workflowStatus` keeps only `draft` and `validated`.
- `Identification`: `entityType`, `localName`. `titles` and `descriptions` are plain text, since `Title` is gone.
- `Publication`: `availableDate`, `citationTitle`.
- `Classification`: `isComposite`, `componentCount`.
- `Agent`: `Mail`.
- `ProductionEvent`: `eventId`, `eventType`, `resultTime`, `samplingPurpose`, `description`, `methods`, `methodDescription`, `responsibility`, `samplingSite`, `featureOfInterest`, `permits`. **Only `location`, `projects` and `processSteps` survive.**
- `ProcessStep`: `method`, `responsibility`, `parameters`. Only `stepType`, `description`, `timestamp` survive.
- `Project`: `id`.
- `Location`: `verticalProfile`, `coordinateUncertaintyM`, `coordinatePrecision`, `obfuscated`; geometry drops `MultiPoint` and `MultiPolygon`.
- `VerticalExtent`: `Representative`, `description`. Only `minimum` and `maximum` survive.
- `VerticalCoordinate`: `unitURI`, `positiveDirection`, `uncertainty`.
- `Orientation`: `measurements`.
- `Repository`: `collectionIdentifier`.
- `RightsAndAccess`: `rightsStatements`, `accessConstraints`.
- `Relation`: the DataCite tail, leaving 13 types that are **exactly our 13** `RELATION_TYPES`.
- `RelatedIdentifier`: the tail, leaving 13 types that are **exactly our 13** `IDENTIFIER_TYPES`.
- `LifecycleEvent`: `submitted`, `destroyed`, `sourceSystem`.

`alternateIdentifiers` and `Project.fundingReferences` still say "Liste de Identifier" but `Identifier` is deleted, so they use the surviving `RelatedIdentifier`.

Attribute casing in the doc is inconsistent working-draft text (`Id`, `Titles=Sample_name`, `LocalityName`, `CoordinateSystem`, `OpenPhysicalDescription`, `Precision Date-heure RFC 3339 avec Z`). Keep the doc's spelling where it is a plain identifier, and normalise the annotated ones to `titles`, `natureOfSample`, `precision`.

## Decisions

These two already hold in the shipped route:

- **The service API sees published samples only.** No draft, no withdrawn, no tombstone. The route forces `status: "published"` inside the account's moderation scope; it is not a client parameter.
- The API exists so an external service can list published IGSNs, declare new ones published on creation (`POST /service/samples`) and update them (`PUT /service/samples/:igsn`); see ADR 0036.

The rest govern the mapping when it lands:

- **Status is not a concept in this API.** Every sample is published, so `record.workflowStatus`, `record.doiState`, `record.lifecycleEvents` and `rightsAndAccess.metadataVisibility` are constants, not derived values. There is no contribution or draft workflow here.
- `schemaVersion` is the constant `"0.7.0"`.
- `identification.landingPage` is `<FRONTEND_URL>samples/<igsn>`, always present since a published sample always has an IGSN.
- A line position's vertical `start`/`end` go to `location.verticalExtent.minimum`/`maximum`.
- `attachments` and `manualGroups` are excluded from the service API entirely, in both directions.
- **A field with no Core slot is dropped.** No extension bag, no invented container: an empty Core cell below means the value does not leave our system.
- The pivot schema stays typed, and an inconsistent institutional trio is rejected (below).

### Proposed Core addition: `ProcessStep` start and end

Both of our dates are ranges (`collectionDate`, `synthesisDate`) and `ProcessStep` has a single `timestamp`, so every end date is lost. Rather than drop them, the payload proposes a Core change: **rename `timestamp` to `timestampStart` and add `timestampEnd`.**

- Rows using it are marked **proposed** below; they are a change request to the Core authors, not something the current document sanctions.
- Open question for them: should an equal start and end collapse back to a single `timestamp`, or always emit the pair?
- If the proposal is refused, those four rows become empty cells like the rest.

### Published-only tightens the schema

`samplePublishBlockers` guarantees a published sample has `nature`, a complete `type` and `material`, `metamorphicFacies` where the material calls for it, `location.position` where the material and provenance require it, `description.collectionDate`, `existenceStatus`, `availabilityStatus`, `scientificContext` with its branch's required fields, and `repository.currentArchive`. Publishing also assigns the IGSN.

So the pivot schema makes required, rather than relaxed-to-optional: `identification.sampleIdentifier`, `identification.landingPage`, `classification.materialCategories`, `classification.natureOfSample`, `classification.sampleObjectTypes`, `curation.existenceStatus`, `curation.availabilityStatus`, `curation.currentRepository`, and `responsibility` min 1. Per `never-test-impossible-states`, an invariant-guaranteed shape is required in the schema and gets no orphan-state test.

Two stay optional because publishing does not guarantee them: `publication.publicationYear` (Core requires it, we may hold null) and `production.location` (absent for a synthetic or returned extraterrestrial sample).

### Consequence: the mapping is lossy

About 38 leaf fields have no Core slot, so `fromCoreSample(toCoreSample(sample))` returns the mapped subset, not the sample. The round-trip test asserts that subset rather than equality. Flagging it because it is a real limit of the format as written, not a reason to change the decision.

### Blocking gap for the future create route

If a created sample is published immediately, the Core payload has to carry everything `samplePublishBlockers` demands. It does not, and the misses are structural rather than cosmetic.

- `scientificContext.provenanceStatus` has no Core slot, and it is the discriminator: without it neither branch of `scientificContext` can be rebuilt, so `scientific_context_missing` always blocks.
- `scientificContext.collectionOrigin` has no slot, so no collection specimen can be published.
- `syntheticDetails.startingMaterial`, `startingMaterialNature`, `startingMaterialComposition`, `finalProduct` and `experimentDuration` have no slot, so no synthetic sample can be published.
- `description.collectionDate.precision` has no slot, so the rebuilt date has to assume `day`.

Worth raising with the Core authors alongside the `timestampEnd` proposal. It does not block the read-only route, but it decides whether a create route is feasible at all.

### The pivot schema enforces our vocabularies

`coreSampleSchema` is not a loose Core validator. Every `Concept` is a shape keyed on `schemeName`, and its `Id` is validated by the matching domain schema.

| `schemeName`                                                                                                                        | `Id` validated by                        |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `otelo:material`                                                                                                                    | `materialPathSchema`                     |
| `otelo:sample-type`                                                                                                                 | `sampleTypeSchema`                       |
| `otelo:nature`                                                                                                                      | `natureSchema`                           |
| `otelo:texture`                                                                                                                     | `textureSchema`                          |
| `otelo:metamorphic-facies`                                                                                                          | `metamorphicFaciesSchema`                |
| `otelo:metamorphic-fabric`                                                                                                          | `metamorphicFabricSchema`                |
| `otelo:geomorphological-environment`                                                                                                | `geomorphologicalEnvironmentSchema`      |
| `otelo:resource-type`                                                                                                               | `resourceTypeSchema`                     |
| `otelo:element`                                                                                                                     | `elementSchema`                          |
| `otelo:storage-condition`, `otelo:temperature-type`, `otelo:humidity-type`, `otelo:pressure-type`, `otelo:light`, `otelo:packaging` | the matching `condition/` enum           |
| `otelo:ocean-sea`, `otelo:navigation-type`                                                                                          | `oceanSeaSchema`, `navigationTypeSchema` |

So a `Concept` never loses which field it came from, and an unknown code is a parse error rather than a silently accepted string. `Concept.label` is the leaf segment for a dot path and the code otherwise, so no i18n runtime is needed in the api; the reverse mapper reads `Id`, never `label`.

### The institutional trio is validated

`optionalInstitutionalGroupIssues` (`domain/institutional-group/institutional-groups-validator.ts`) already answers "is this organisme/OSU/labo triple coherent", against `filterLaboratoriesByOrgAndOsu`, the single source of truth. `coreSampleSchema` classifies the `Creator` agent's affiliations against the three catalogs and calls it in a `superRefine`, so an OSU outside its organisme or a labo outside the pair is a parse error in both directions. No second catalog and no per-mapper copy.

## Field-by-field mapping

An empty Core cell means no slot was found in the document. Nothing is invented to fill one. Every "?" is a question for the Core authors and gates the second pass.

Our field paths are leaves of `sampleSchema` (`packages/domain/src/sample/sample.ts`).

### Root

| Our field                       | Core field                                                                                                        | Comment / question                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `record.recordId`                                                                                                 | As `urn:uuid:<id>`. Core wants a uri; is a `urn:uuid` acceptable, or should `recordId` be the landing page?                                                                                                                                                                                                               |
| `name`                          | `identification.titles[0]`                                                                                        | `titles` is a plain string list now that `Title` is deleted.                                                                                                                                                                                                                                                              |
| `specificName`                  | `identification.titles[1]`                                                                                        | `identification.localName` is deleted, so the second title is the only candidate. Title order becomes load-bearing for the reverse. Confirm, or leave `specificName` unmapped.                                                                                                                                            |
| `nature`                        | `classification.natureOfSample`                                                                                   | Doc spells the row "Nature of sample"; normalised.                                                                                                                                                                                                                                                                        |
| `type`                          | `classification.sampleObjectTypes[]`                                                                              | Core is a list, we hold one value.                                                                                                                                                                                                                                                                                        |
| `material`                      | `classification.materialCategories[]`                                                                             | Core is a list, we hold one dot path.                                                                                                                                                                                                                                                                                     |
| `texture`                       | `classification.contextCategories[]`                                                                              | `schemeName: otelo:texture`. The doc describes `contextCategories` as the material sub-classification (`Rock>Igneous>Plutonic>Felsic>Granite`), which our `material` path already covers, so this is a stretch. Confirm, or leave it unmapped.                                                                            |
| `metamorphicFacies`             | `classification.contextCategories[]`                                                                              | Same caveat, `schemeName: otelo:metamorphic-facies`.                                                                                                                                                                                                                                                                      |
| `metamorphicFabric`             | `classification.contextCategories[]`                                                                              | Same caveat, `schemeName: otelo:metamorphic-fabric`.                                                                                                                                                                                                                                                                      |
| `geomorphologicalEnvironment`   | `classification.contextCategories[]`                                                                              | Same caveat. `production.featureOfInterest.categories` was the natural home and is deleted.                                                                                                                                                                                                                               |
| `resourceType`                  | `classification.contextCategories[]`                                                                              | Same caveat, `schemeName: otelo:resource-type`.                                                                                                                                                                                                                                                                           |
| `collectionMethod`              |                                                                                                                   | **No slot found.** `production.methods` is deleted. `keywords[]` or `contextCategories[]` would carry it, but a collection method is neither a keyword nor a classification. Want one of them anyway?                                                                                                                     |
| `collectionMethodDescription`   | `production.processSteps[Collection].description`                                                                 | Core makes the step's `description` required, but a published sample is guaranteed a `collectionDate` and **not** a `collectionMethodDescription`, so the date is regularly lost with the step. Emit a placeholder description, or propose making `ProcessStep.description` optional alongside the `timestampEnd` change? |
| `geologicalContextDescription`  | `identification.descriptions`                                                                                     | `production.samplingSite.description` was the natural home and is deleted. `descriptions` is the only surviving free-text field, and `openDescription` competes for it.                                                                                                                                                   |
| `existenceStatus`               | `curation.existenceStatus`                                                                                        | 1:1, snake to camel. Guaranteed by the publish blockers, so required, no `unknown` fallback.                                                                                                                                                                                                                              |
| `availabilityStatus`            | `curation.availabilityStatus`                                                                                     | 1:1, snake to camel. Guaranteed, so required.                                                                                                                                                                                                                                                                             |
| `publicationYear`               | `publication.publicationYear`                                                                                     | Core requires it; omitted when null, which relaxes the schema.                                                                                                                                                                                                                                                            |
| `economicInterestElements[]`    | `keywords[]`                                                                                                      | `schemeName: otelo:element`.                                                                                                                                                                                                                                                                                              |
| `economicResourceTypePrecision` |                                                                                                                   | **No slot found.**                                                                                                                                                                                                                                                                                                        |
| `economicDepositName`           |                                                                                                                   | **No slot found.** `production.featureOfInterest.label` is deleted.                                                                                                                                                                                                                                                       |
| `economicDepositDescription`    |                                                                                                                   | **No slot found.** `production.featureOfInterest.description` is deleted.                                                                                                                                                                                                                                                 |
| `igsn`                          | `identification.sampleIdentifier`                                                                                 | As `https://doi.org/<igsn>`. Always present. Our legacy `CNRS…`/`TOAE…` IGSNs are Handles, not DOIs, and the doc's DOI-URL pattern does not fit them. What should `sampleIdentifier` be for a legacy IGSN?                                                                                                                |
| `igsn`                          | `identification.landingPage`                                                                                      | `<FRONTEND_URL>samples/<igsn>`. Always present.                                                                                                                                                                                                                                                                           |
| `status`                        |                                                                                                                   | Not a concept in this API: the list is published-only, so nothing varies with it.                                                                                                                                                                                                                                         |
| (constant)                      | `record.workflowStatus`                                                                                           | `"validated"`.                                                                                                                                                                                                                                                                                                            |
| (constant)                      | `record.doiState`                                                                                                 | `"findable"`.                                                                                                                                                                                                                                                                                                             |
| (constant)                      | `rightsAndAccess.metadataVisibility`                                                                              | `"public"`, which the doc requires whenever `doiState` is `findable`.                                                                                                                                                                                                                                                     |
| `createdAt`                     | `record.createdAt`, `record.lifecycleEvents[created].timestamp`                                                   |                                                                                                                                                                                                                                                                                                                           |
| `updatedAt`                     | `record.updatedAt`, `record.lifecycleEvents[registered].timestamp`, `record.lifecycleEvents[published].timestamp` | `findable` obliges both a `registered` and a `published` event. We keep no per-event history, so both carry `updatedAt`, which is wrong for a sample edited after publication. Record a real publication timestamp instead, or accept the approximation?                                                                  |
| `owner.firstname`, `owner.name` | `responsibility[Creator].agent.name`                                                                              | Joined as `"<firstname> <name>"`. Not reversible for a compound firstname, but `owner` is api-owned and absent from `createSampleSchema`, so the reverse never needs it.                                                                                                                                                  |
| `institutionalOrganization`     | `responsibility[Creator].agent.affiliations[].id`                                                                 | ROR uri, `name` from `organization.ts`. Core has no level marker, so the reverse re-classifies each affiliation against the three catalogs.                                                                                                                                                                               |
| `institutionalOsu`              | `responsibility[Creator].agent.affiliations[].id`                                                                 | Same. Validated with the trio.                                                                                                                                                                                                                                                                                            |
| `institutionalLaboratory`       | `responsibility[Creator].agent.affiliations[].id`                                                                 | Same. Validated with the trio.                                                                                                                                                                                                                                                                                            |
| `parents[].igsn`                | `relations[].targetIdentifier.value`                                                                              | With `relationType: IsDerivedFrom`, `identifierType: DOI` (or `IGSN` for a legacy Handle, per the doc's adapter rule).                                                                                                                                                                                                    |
| `parents[].name`                | `relations[].targetTitles[0]`                                                                                     |                                                                                                                                                                                                                                                                                                                           |
| `parents[].material`            |                                                                                                                   | **No slot found.** Derivable from the parent's own record anyway.                                                                                                                                                                                                                                                         |
| `parents[].id`                  |                                                                                                                   | **No slot found.** A `Relation` addresses by IGSN, so `createSampleSchema.parentIds` cannot be rebuilt by a pure mapper.                                                                                                                                                                                                  |
| `attachments[]` (6 fields)      |                                                                                                                   | **Excluded from the service API**, both directions.                                                                                                                                                                                                                                                                       |
| `manualGroups[]`                |                                                                                                                   | **Excluded from the service API**, both directions.                                                                                                                                                                                                                                                                       |
| (constant)                      | `schemaVersion`                                                                                                   | `"0.7.0"`.                                                                                                                                                                                                                                                                                                                |
| (constant)                      | `publication.publisher`                                                                                           | `{ name: "OTELO" }`. No OTELO row in `institutional-group/organization.ts`, so no ROR `id`. Should one be added?                                                                                                                                                                                                          |
| (constant)                      | `production.location.CoordinateSystem`                                                                            | `"WGS84 GreenWich"`, per the doc.                                                                                                                                                                                                                                                                                         |
|                                 | `identification.alternateIdentifiers[]`                                                                           | No source field. Leave empty?                                                                                                                                                                                                                                                                                             |
|                                 | `record.metadataLanguage[]`, `record.metadataVersion`                                                             | No source field. Leave empty?                                                                                                                                                                                                                                                                                             |
|                                 | `curation.curationDescription`                                                                                    | No source field.                                                                                                                                                                                                                                                                                                          |
|                                 | `rightsAndAccess.rightsURIs[]`, `.embargoUntil`, `.sensitiveLocation`                                             | No source field. The doc itself asks "quelle licence sur fiche échantillon ? (CC-BY …)", so this is open on their side too.                                                                                                                                                                                               |
|                                 | `compliesWith[]`                                                                                                  | Should the payload declare the Core profile URI here?                                                                                                                                                                                                                                                                     |

### `location`

| Our field                                                                               | Core field                                                           | Comment / question                                                                                                                   |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `location.position.type`                                                                |                                                                      | Recovered from `geometry.type`, so no field of its own.                                                                              |
| `location.position.longitude`, `.latitude`                                              | `production.location.geometry.coordinates[0]`, `[1]`                 | `geometry.type: Point`.                                                                                                              |
| `location.position.vertical.position`                                                   | `production.location.verticalExtent.minimum.value`                   | `Representative` is deleted, so a single value uses `minimum` alone and `maximum` stays absent. Confirm that reading.                |
| `location.position.westLongitude`, `.eastLongitude`, `.southLatitude`, `.northLatitude` | `production.location.geometry.coordinates[0][0..4]`                  | `geometry.type: Polygon`, one closed 5-position ring. West > east is a valid dateline-crossing area (ADR 0014) and stays as written. |
| `location.position.vertical.min`, `.max`                                                | `production.location.verticalExtent.minimum.value`, `.maximum.value` |                                                                                                                                      |
| `location.position.startLongitude`, `.startLatitude`, `.endLongitude`, `.endLatitude`   | `production.location.geometry.coordinates[0]`, `[1]`                 | `geometry.type: LineString`.                                                                                                         |
| `location.position.vertical.start`, `.end`                                              | `production.location.verticalExtent.minimum.value`, `.maximum.value` | Note start > end is legal for us, but `minimum`/`maximum` implies an order, so the pair can silently invert.                         |
| `location.position.vertical.reference`                                                  | `production.location.verticalExtent.*.reference`                     | 1:1, snake to camel: `depth_below_ground` -> `depthBelowGround`.                                                                     |
| `location.position.vertical.system`                                                     | `production.location.verticalExtent.*.verticalReferenceSystem`       | The doc lists these as prose labels with EPSG codes. Emit the EPSG code (`EPSG:5720`), the full label, or our own code?              |
| (constant)                                                                              | `production.location.verticalExtent.*.unit`                          | `"metre"`, fixed by the doc.                                                                                                         |
| `location.region.kind`                                                                  |                                                                      | Recovered from which of `countryCodes` / `oceanOrSea` is set.                                                                        |
| `location.region.country`                                                               | `production.location.countryCodes[]`                                 |                                                                                                                                      |
| `location.region.oceanSea`                                                              | `production.location.oceanOrSea`                                     | `schemeName: otelo:ocean-sea`.                                                                                                       |
| `location.navigationType`                                                               | `production.location.navigationTypes`                                | `schemeName: otelo:navigation-type`. Core names it plural but types it as a single Concept.                                          |
| `location.localityName`                                                                 | `production.location.LocalityName[]`                                 |                                                                                                                                      |
| `location.localityDescription`                                                          | `production.location.locationDescription`                            |                                                                                                                                      |

### `description`

| Our field                              | Core field                                                                | Comment / question                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `description.collectionDate.start`     | `production.processSteps[Collection].timestampStart`                      | **Proposed**: the doc's field is `timestamp`. `resultTime` and `TemporalExtent` are unreachable, so the step is the only carrier left.     |
| `description.collectionDate.end`       | `production.processSteps[Collection].timestampEnd`                        | **Proposed Core addition**, no range exists today. Do we map an equal start and end back to a single `timestamp`, or always emit the pair? |
| `description.collectionDate.precision` |                                                                           | **No slot found**, `TemporalExtent.precision` is unreachable.                                                                              |
| `description.collectionDate.timeZone`  |                                                                           | **No slot found**. The offset can ride in the RFC 3339 timestamp, but the IANA zone itself cannot (ADR 0034).                              |
| `description.oriented`                 | `physicalDescription.orientation.oriented`                                |                                                                                                                                            |
| `description.orientationExplanation`   | `physicalDescription.orientation.description`                             |                                                                                                                                            |
| `description.openDescription`          | `physicalDescription.OpenPhysicalDescription`                             | Name matches exactly.                                                                                                                      |
| `description.length.value`, `.unit`    | `physicalDescription.dimensions.length.value`, `.unitCode` + `.unitLabel` | `unitCode` is UCUM, `unitLabel` keeps our code so the reverse is exact. `dimensions` has free keys.                                        |
| `description.width.value`, `.unit`     | `physicalDescription.dimensions.width.*`                                  |                                                                                                                                            |
| `description.thickness.value`, `.unit` | `physicalDescription.dimensions.thickness.*`                              |                                                                                                                                            |
| `description.mass.value`, `.unit`      | `physicalDescription.mass.value`, `.unitCode` + `.unitLabel`              |                                                                                                                                            |
| `description.volume.value`, `.unit`    | `physicalDescription.volume.value`, `.unitCode` + `.unitLabel`            | UCUM for `ml`/`l` is `mL`/`L`. Canonical UCUM in `unitCode`, or our own codes?                                                             |

### `condition`

| Our field                                          | Core field                                                                | Comment / question                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `condition.packaging`                              | `curation.storageCondition.packaging`                                     | `schemeName: otelo:packaging`.                                                                                                |
| `condition.storageConditions[]`                    | `curation.storageCondition.conditionTypes[]`                              | `schemeName: otelo:storage-condition`.                                                                                        |
| `condition.temperature.type`                       | `curation.storageCondition.conditionTypes[]`                              | `schemeName: otelo:temperature-type`. Core has no qualitative range, so this detaches from its measurement.                   |
| `condition.temperature.measurement.value`, `.unit` | `curation.storageCondition.temperature.value`, `.unitCode` + `.unitLabel` |                                                                                                                               |
| `condition.humidity.type`                          | `curation.storageCondition.conditionTypes[]`                              | `schemeName: otelo:humidity-type`.                                                                                            |
| `condition.humidity.percentage`                    | `curation.storageCondition.relativeHumidityPercent`                       |                                                                                                                               |
| `condition.pressure.type`                          | `curation.storageCondition.conditionTypes[]`                              | `schemeName: otelo:pressure-type`.                                                                                            |
| `condition.pressure.measurement.value`, `.unit`    | `curation.storageCondition.pressure.value`, `.unitCode` + `.unitLabel`    | UCUM has no `kbar` or `gpa`. Emit the scaled `bar`/`Pa`, or keep our code in `unitLabel` and use the base unit as `unitCode`? |
| `condition.light`                                  | `curation.storageCondition.lightCondition`                                | `schemeName: otelo:light`.                                                                                                    |
| `condition.specificConditions`                     | `curation.storageCondition.description`                                   |                                                                                                                               |

### `repository`

| Our field                                                                       | Core field                                            | Comment / question                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `repository.currentArchive`                                                     | `curation.currentRepository.organization.id`, `.name` | ROR uri as `id`, catalog name as `name`.          |
| `repository.currentArchiveContactFirstname`, `.currentArchiveContactLastname`   | `curation.currentRepository.contact.name`             | Joined `firstname lastname`, `agentType: Person`. |
| `repository.collectionName`                                                     | `curation.currentRepository.collectionName`           |                                                   |
| `repository.originalArchive`                                                    | `curation.originalRepository.organization.name`       | Free text on our side, so no ROR `id`.            |
| `repository.originalArchiveContactFirstname`, `.originalArchiveContactLastname` | `curation.originalRepository.contact.name`            | Same join.                                        |
|                                                                                 | `curation.*Repository.storageLocation`                | No source field.                                  |

The two archive contacts are admin-only on the public API (`redact-archive-contacts.ts`). The service API is machine-authenticated inside the account's own reach, so it emits them unredacted.

### `scientificContext`

| Our field                                        | Core field                                   | Comment / question                                                                                                                                                                                           |
| ------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scientificContext.provenanceStatus`             |                                              | **No slot found.** `production.eventType` carried it and is deleted.                                                                                                                                         |
| `scientificContext.funderOrganizations[]`        | `production.projects[0].fundingReferences[]` | As `RelatedIdentifier` with `identifierType: URL` and the ROR uri as `value`. The doc still says "Liste de Identifier" but `Identifier` is deleted; confirm `RelatedIdentifier` is the intended replacement. |
| `scientificContext.researchProgramName`          | `production.projects[0].name`                |                                                                                                                                                                                                              |
| `scientificContext.chiefScientist`               | `responsibility[ChiefScientist].agent.name`  |                                                                                                                                                                                                              |
| `scientificContext.chiefScientistOrcid`          | `responsibility[ChiefScientist].agent.id`    | As the ORCID uri.                                                                                                                                                                                            |
| `scientificContext.hostInstitution[]`            | `responsibility[HostingInstitution].agent`   | One `AgentRole` per ROR. The doc's `agentType` row lists only `Person`; is `Organization` a legal value?                                                                                                     |
| `scientificContext.collectorName`                | `responsibility[Collector].agent.name`       | Shared by both provenance branches.                                                                                                                                                                          |
| `scientificContext.collectorOrcid`               | `responsibility[Collector].agent.id`         |                                                                                                                                                                                                              |
| `scientificContext.researchCampaign`             |                                              | **No slot found.** `production.samplingSite` is deleted.                                                                                                                                                     |
| `scientificContext.funding`                      |                                              | **No slot found.** `fundingReferences` takes identifiers, not free text.                                                                                                                                     |
| `scientificContext.researchProgramDescription`   |                                              | **No slot found.** `Project` has only `name` and `fundingReferences`.                                                                                                                                        |
| `scientificContext.fieldName`                    |                                              | **No slot found.** `production.samplingSite.label` is deleted.                                                                                                                                               |
| `scientificContext.missionDescription`           |                                              | **No slot found.** `production.description` is deleted.                                                                                                                                                      |
| `scientificContext.collectionCurator`            | `responsibility[Curator].agent.name`         |                                                                                                                                                                                                              |
| `scientificContext.collectionOrigin`             |                                              | **No slot found.** Its five values were `production.eventType` sub-values, deleted.                                                                                                                          |
| `scientificContext.collectionContextDescription` |                                              | **No slot found.**                                                                                                                                                                                           |

### `syntheticDetails`

| Our field                                            | Core field                                          | Comment / question                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `syntheticDetails.synthesisDate.start`               | `production.processSteps[Synthesis].timestampStart` | **Proposed**: the doc's field is `timestamp`.                                                                      |
| `syntheticDetails.synthesisDate.end`                 | `production.processSteps[Synthesis].timestampEnd`   | **Proposed Core addition**, same question as the collection date.                                                  |
| `syntheticDetails.experimentalProtocol`              | `production.processSteps[Synthesis].description`    | The step's `description` is required, so no protocol means no `Synthesis` step and the synthesis dates go with it. |
| `syntheticDetails.operatorName`                      | `responsibility[Researcher].agent.name`             | `Researcher` is the closest surviving role. Better fit in the role list?                                           |
| `syntheticDetails.operatorOrcid`                     | `responsibility[Researcher].agent.id`               |                                                                                                                    |
| `syntheticDetails.researchStructure[]`               | `responsibility[Researcher].agent.affiliations[]`   |                                                                                                                    |
| `syntheticDetails.startingMaterial`                  |                                                     | **No slot found.** `ProcessStep.parameters` is deleted.                                                            |
| `syntheticDetails.startingMaterialNature`            |                                                     | Same.                                                                                                              |
| `syntheticDetails.startingMaterialComposition`       |                                                     | Same.                                                                                                              |
| `syntheticDetails.finalProduct`                      |                                                     | Same.                                                                                                              |
| `syntheticDetails.experimentType`                    |                                                     | Same. `ProcessStep.method` is deleted too.                                                                         |
| `syntheticDetails.experimentDuration.value`, `.unit` |                                                     | Same.                                                                                                              |
| `syntheticDetails.experimentDurationNotRelevant`     |                                                     | Same.                                                                                                              |
| `syntheticDetails.temperature.value`, `.unit`        |                                                     | Same. `curation.storageCondition.temperature` is storage, not synthesis, so it must not be reused.                 |
| `syntheticDetails.pressure.value`, `.unit`           |                                                     | Same.                                                                                                              |
| `syntheticDetails.experimentPurpose`                 |                                                     | **No slot found.** `production.samplingPurpose` is deleted.                                                        |
| `syntheticDetails.equipmentUsed`                     |                                                     | **No slot found.**                                                                                                 |

### `age`

| Our field                 | Core field | Comment / question                                                                                |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `age.numericAgeMin`       |            | **No slot found.** Core has no age or chronostratigraphy block.                                   |
| `age.numericAgeMax`       |            | Same.                                                                                             |
| `age.numericAgeUnit`      |            | Same.                                                                                             |
| `age.numericAgeYearsUnit` |            | Same.                                                                                             |
| `age.geologicalAgeMin`    |            | Same. These are ICS stratigraphic units, so `keywords[]` could carry them as Concepts. Want that? |
| `age.geologicalAgeMax`    |            | Same.                                                                                             |
| `age.geologicalUnit`      |            | Same.                                                                                             |

### `security`

| Our field                           | Core field | Comment / question                                                                      |
| ----------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `security.radioactivity`            |            | **No slot found.** No hazard block, and `rightsAndAccess.accessConstraints` is deleted. |
| `security.radioactivityExplanation` |            | Same.                                                                                   |
| `security.asbestosRich`             |            | Same.                                                                                   |
| `security.asbestosExplanation`      |            | Same.                                                                                   |
| `security.chemicalRisk`             |            | Same.                                                                                   |
| `security.chemicalRiskExplanation`  |            | Same.                                                                                   |

### `relations[]`

Near 1:1: the 13 surviving `relationType` values are exactly our 13, and the 13 surviving `identifierType` values are exactly our 13.

| Our field                             | Core field                                    | Comment / question                                                                                          |
| ------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `relations[].relationType`            | `relations[].relationType`                    | Snake to PascalCase, `is_cited_by` -> `IsCitedBy`.                                                          |
| `relations[].identifierType`          | `relations[].targetIdentifier.identifierType` | To the doc's casing, `doi` -> `DOI`, `arxiv` -> `arXiv`.                                                    |
| `relations[].identifier`              | `relations[].targetIdentifier.value`          |                                                                                                             |
| `relations[].identifier`              | `relations[].targetURI`                       | Also as the navigable form from `relation-target-href.ts` for a DOI or URL. Redundant, or wanted?           |
| `relations[].targetTitle`             | `relations[].targetTitles[0]`                 |                                                                                                             |
| `relations[].targetResourceType`      | `relations[].targetResourceType`              | Our 31 values against the doc's list; assert the two sets match at compile time and report any that do not. |
| `relations[].relationTypeInformation` | `relations[].relationTypeInformation`         |                                                                                                             |
| `relations[].relatedMetadataScheme`   | `relations[].relatedMetadataScheme`           |                                                                                                             |
| `relations[].schemeURI`               | `relations[].schemeURI`                       |                                                                                                             |
| `relations[].schemeType`              | `relations[].schemeType`                      |                                                                                                             |
| `relations[].description`             | `relations[].description`                     |                                                                                                             |
| `relations[].id`                      |                                               | Our row uuid, regenerated on write.                                                                         |
