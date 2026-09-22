# 0047. The synthesis operator gets its own Core slot

Date: 2026-09-22

## Status

Accepted. Supersedes the "The `Researcher` disambiguation" section of ADR [0046](0046-additional-scientific-roles.md).

## Context

`/service` treated a synthetic sample's `syntheticDetails.operator*` and a field sample's `scientificContext.additionalRoles[]` `researcher` row as the same Core term, `Researcher`, told apart by POSITION in `responsibility`: the first `Researcher` agent was the operator, the rest were additional-role credits (ADR [0046](0046-additional-scientific-roles.md), "The `Researcher` disambiguation" section).

That guess misfires on client-authored input. A `POST /service/samples` with an experiment, no operator and a `Researcher` credit recorded that person as the operator, dropped the credit, then published cleanly since the publish guard found an operator. Silent misattribution of a real person.

ADR 0046 rejected a distinct Core slot for the operator on the ground that it would break "the shipped `/service` contract for every already-published synthetic sample". That claim is stale: the project is in beta, has no published IGSN, no prod environment and no named external `/service` consumer.

The signed mapping docx's OGC-OMS projection already models the operator as a step property (`sam:preparationStep.processOperator`), not a `responsibility` agent, so a dedicated slot is also the reading the mapping authors intended.

## Decision

The operator leaves `responsibility` for `extensions.experiment.operator`, a `corePersonSchema` (Person agent fields, no `agentType`/`userId`).

- One concept per slot: every `Researcher` agent in `responsibility` is a scientific-context credit, with certainty, on create and update alike.
- Core v0.10.0 has no operator slot, so `extensions.experiment.operator` is a recorded deviation; see [igsn-core-mapping.md](../igsn-core-mapping.md).
- `operator-agent-roles.ts` turns that field back into a `Researcher` `CoreAgentRole[]` for DataCite and iSamples, so the operator is still credited as a `Researcher` in both derived formats.

This supersedes the "The `Researcher` disambiguation" section of ADR 0046, which is left in place and marked superseded rather than deleted.

## Rejected alternatives

- **Keep the positional rule, just document it better.** Does not fix the misattribution: an experiment with no operator and one `Researcher` credit still guesses wrong.
- **A distinct Core ROLE term for the operator.** The v0.10.0 role vocabulary has no term for a lab operator; inventing one is a heavier deviation than an extension field, and still leaves the operator inside `responsibility` where the same one-per-role ambiguity questions would recur.

## Consequences

- `core-path.ts`'s four `syntheticDetails.operator*`/`researchStructure` entries retarget from `responsibility` to `extensions.experiment.operator.*`.
- `fromCoreAdditionalRoles` drops the `operatorPending` special case; every `responsibility` `Researcher` agent is an additional role.
- `from-core-synthetic-details.ts` reads the operator from `extensions.experiment.operator` and keeps its `experiment == null && step == null` guard for whether the sample is synthetic at all.
