# 0047. Drop `relationTypeInformation`

Date: 2026-09-22

## Status

Accepted.

## Context

`relations[].relationTypeInformation` was a documented field on the published `/service` OpenAPI document (`coreRelationSchema`, ADR [0041](0041-openapi-for-the-service-api.md)), backed by an admin form control, a `sample_relation` column, and both directions of the Core mapping. No app ever read or rendered it, and all three export mappings (DataCite, iSamples, OMS) already dropped it on the way out. Removing a field from a published contract is costly to reverse, so it gets an ADR.

## Decision

Drop `relationTypeInformation` from the whole stack in one change:

- the admin form control and draft schema
- `domain/sample/relation/model.ts` (`sampleRelationSchema`, `createSampleRelationSchema`)
- `domain/sample/core/core-relation-schema.ts` and both Core mappings (`to-core-relations.ts`, `from-core-relation.ts`)
- the api read/write path
- the `sample_relation.relation_type_information` Postgres column (migration `20260922135420-drop-relation-type-information.ts`)

`coreSampleSchema` is strict, so an external `/service` client still sending `relationTypeInformation` now gets a 400 instead of having it silently accepted and stored.

## Rejected

- **Keep the column and the Core field, remove only the form control.** Leaves a write-only field on the public contract with no app ever setting it, and keeps a column nothing populates.

## Consequences

- The `/service` OpenAPI document loses a field; any external client sending it starts getting a 400.
- The admin relation block gains room to lead with the identifier field instead.
- No data migration: the column carried no read path, so dropping it loses nothing anyone consumed.
