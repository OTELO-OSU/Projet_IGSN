# 0037. Relaxed publish and post-publication rules

Date: 2026-09-09

## Status

Accepted. Neither ADR 0021 nor ADR 0022 is superseded: both mechanisms stand, only the marks on the tree and in the lock maps moved.

## Context

The product owner revised the two-column spec (obligatory to publish / editable after publication) for every sample field. The revision is almost entirely a relaxation: 8 publish blockers drop (metamorphic facies, synthetic starting-material nature, synthetic experiment duration, funding organizations, research programme name, chief scientist, hosting institution, current archive) and nearly every post-publication lock lifts. Only the sample-link section adds a requirement.

Each rule already lived in one place (ADR 0021, ADR 0022), so applying the new spec is a marking change, not a rewrite. The one exception is the material hierarchy: the required-to-publish depth and the editable-after-publication depth both land on the same niveau-1 frontier for every branch, which the code expressed with two differently-behaved tree props.

## Decision

**Publish blockers.** The 8 blockers above are removed. Two are added for the sample-link section: `relation_resource_type_missing` (a relation with no `targetResourceType`) and `attachment_metadata_missing` (an attachment missing any of its resource type, title and description). `sample-publish-blockers.ts` stays the single place stating why a sample cannot publish (ADR unchanged).

**Post-publication locks.** `published-field-lock.ts` shrinks to five surviving entries: `manualGroupIds` (ADR 0025), `scientificContext.provenanceStatus`, `collectorName` on the field-sample branch, `collectionOrigin` on the collection-specimen branch, and `syntheticDetails.operatorName`. The location and description lock maps are deleted outright: position, region and collection date become editable. `mergeLocation`, `mergeDescription` and `mergeVertical` are removed with them; a frozen material that forbids a location still drops one, now through `mergeMaterialDependent` keying on whether the merge accepted the incoming material rather than on `allowsLocation` directly, which also closes a gap where a cross-branch move within the same frozen root could keep a location a sibling material forbids.

**Material hierarchy: `optional` becomes a frontier.** `TreeNode.frozenWhenPublished` already inherits: `frozenMaterialPrefix` walks to the first marked segment and opens everything below it. `optional` did not: it applied to the node alone, so a partial path just above a marked node was invalid while everything below it was valid, which cannot express "niveau 2 or deeper is always a valid stop". `optional` now inherits the same way, through `isOptionalAtOrAbove` (`domain/src/sample/path/is-optional.ts`), read by `material/is-complete.ts`, `type/is-complete.ts` and `design-system/src/lib/hierarchy.ts` (`canStopAtPath`). This is a cross-package contract: three other vocabularies already set `optional` (collection-method, resource-type, geomorphological-environment).

With both props inheriting, the material rules collapse onto the 13 niveau-1 nodes (the 6 children of `rock`, the 4 of `sediment`, the 3 of `extraterrestrial_rock`), each carrying `{ optional: true, frozenWhenPublished: false }`. Niveau 1 is one frontier for both the publish depth and the unlock depth. `mineral`, `fossil` and `synthetic_rock_mineral` carry neither: they have no sub-level, so they are already complete and wholly frozen. Moving the frontier later is a matter of moving these marks, not editing logic.

Measured before shipping: replaying both readings (node-only vs. inherited) over every path of all four vocabularies changed zero verdicts for the three vocabularies that already used `optional` (collection-method 48 paths, resource-type 69, geomorphological-environment 71) and changed exactly the 112 intended material verdicts out of 741 paths. A second reviewer reproduced this independently.

### Rejected

- **A `stopDepth` field on `Hierarchy`.** Puts the stop depth in code beside a tree that already declares stop points, and the next revision of the spec table would mean editing logic instead of moving marks.
- **`optional: true` on all 125 internal nodes at depth >= 2.** The per-node cost of leaving `optional` non-inheriting; correct but scales with the tree instead of with the frontier.

## Consequences

- ADR 0021's lock-map mechanism and ADR 0022's `frozenWhenPublished` frontier are both unchanged in shape; only their contents (which fields, which depth) moved. Neither is superseded.
- `optional` now means the same thing everywhere `frozenWhenPublished` does: a mark opens its whole subtree, not just the marked node. A future vocabulary author marks the frontier node only, not every descendant.
- The publish and unlock depths for material are now visibly the same frontier in the tree data, so a future PO revision that keeps them equal is a data change; one that splits them again needs a second mechanism.
- `sample-publish-blockers.ts` needed no material-specific change: `isMaterialComplete` became correct on the new marks without touching its call site, and `hierarchy-stop-consistency.spec.ts` is the standing guard that the widget's stop hint and the domain verdict agree.
