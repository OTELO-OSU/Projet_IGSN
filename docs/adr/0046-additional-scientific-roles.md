# 0046. Additional scientific roles on a field sample

Date: 2026-09-21

## Status

Accepted. Its "The `Researcher` disambiguation" section is superseded by ADR [0047](0047-synthesis-operator-core-slot.md).

## Context

A field sample credits a fixed cast today: a collector, a chief scientist, a host institution. Contributors asked for a repeatable list of further credits (a project manager, other researchers, a data manager) without a cap on how many people hold a given role.

IGSN Core v0.10.0's `responsibility` is a `min 1` list of `AgentRole` with no cross-agent uniqueness rule, and its controlled role vocabulary already includes `Researcher`, `ProjectManager`, `ProjectMember` and `DataManager` (verified against `IGSN-Core_v0.10.0.docx`). Nothing here is a deviation from Core; the mapping only starts using terms the vocabulary already admits.

A synthetic sample already maps `syntheticDetails.operator` to Core's `Researcher` role. Adding `Researcher` to the new repeatable list creates two possible sources for the same Core role on the same sample.

## Decision

- Add `scientificContext.additionalRoles[]` to the `field_sample` branch of `scientificContext` alone: `{ role, personUserId | personFirstname/personLastname/personOrcid }`.
- `role` is one of `researcher | project_manager | project_member | data_manager`, repeatable, persisted in the new `sample_additional_role` table.
- A row is editable after publication: no entry in `published-field-lock.ts` freezes it.
- A row with neither an account link nor a typed name blocks publication (`additional_role_firstname_missing` / `additional_role_lastname_missing`).
- It lives inside the `field_sample` branch, not as a top-level `Sample.additionalRoles`, so "field sample only" is structural: the type system rules out the field on a collection specimen or a synthetic sample, and the provenance-switch drop already wipes the whole branch for free, with no extra exclusion to write or maintain.

### The `Researcher` disambiguation (superseded)

Superseded by ADR [0047](0047-synthesis-operator-core-slot.md): the operator now has its own Core slot (`extensions.experiment.operator`), so `responsibility` no longer needs the positional rule below.

`syntheticDetails.operator` already maps to Core's `Researcher` role for a synthetic sample. Adding `researcher` to the repeatable additional roles means a synthetic sample can now carry two sources of `Researcher` agents: the operator and an additional role.

- `toCoreResponsibility` emits the operator first, then the additional roles, so a synthetic sample's `Researcher` agents always open with the operator.
- The reverse mapper (`fromCoreAdditionalRoles`) walks `responsibility` in document order, never grouped by role: `keepContactLinks` aligns incoming and stored additional-role rows by their index in the array, so array order carries meaning and must round-trip untouched.
- `fromCoreAdditionalRoles` treats the first `Researcher` agent as the operator when the sample is synthetic (`fromCoreSyntheticDetails(body) != null`), and only the rest as additional roles. `from-core-synthetic-details.ts` no longer treats a lone `Researcher` agent as proof of synthesis on its own: the guard is now `experiment == null && step == null`, since a non-synthetic sample can legitimately carry a `Researcher` additional role.
- This is lossless: `/service` only carries published samples, and `samplePublishBlockers` guarantees both an experiment/synthesis step and an operator on any published synthetic sample. A `GET` therefore always finds the operator's `Researcher` agent in first position on a synthetic sample, so stripping it back off is unambiguous.

### Rejected alternatives

- **Positional disambiguation alone, with no `experiment`/`step` guard.** Reading "first `Researcher` is the operator" without first checking synthesis would fabricate `syntheticDetails` on a non-synthetic sample that happens to credit a `Researcher` first.
- **A top-level `Sample.additionalRoles`.** Available on every provenance status, so it would need a cross-field refinement to keep it off a collection specimen, and its own exclusion in the provenance-switch drop, duplicating a rule the field-sample branch gets for free.

## Consequences

- `CORE_ROLES` gains `ProjectManager`, `ProjectMember`, `DataManager`; `REPEATABLE_ROLES` gains all four scientific roles (`Researcher` included, now repeatable for the additional-role case as well as the single operator case).
- All four `domain/sample/contact-link.ts` walkers (`checkContactLinks`, `dropTypedNameWhenLinked`, `clearContactLinks`, `keepContactLinks`) now recurse through arrays, not just nested objects, so the same link/typed-name exclusivity and index-aligned link retention apply to each row of `additionalRoles`.
- A row needs no create schema of its own: `createScientificContextSchema` stays `scientificContextSchema.superRefine(checkContactLinks)` and the recursion reaches each row, reporting on `additionalRoles[i].personUserId`. The read schema carries no refine, since the api resolves a linked account's name live and a read row legitimately holds both the link and the resolved name at once.
- DataCite's `contributorType` and the iSamples `ISAMPLES_ROLES` crosswalk each gain the three new roles; see `docs/datacite-mapping.md` and `docs/isamples-mapping.md`.
