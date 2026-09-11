# 0038. Explicit material root

Date: 2026-09-11

## Status

Accepted.

## Context

Material had five roots (`rock`, `sediment`, `mineral`, `synthetic_rock_mineral`, `extraterrestrial_rock`) and no common parent: their "rock and sediment" identity was implicit because it was the only one. Future top-level kinds (liquid, gas) need a sibling to stand beside, not a place in that flat list.

## Decision

- `rock_and_sediment` is the single entry of `MATERIAL_ROOTS`, the five former roots its `choices` (the families).
- The root lives in storage too: a migration prepends it to every stored `material` ltree (`down` strips it with `subpath`).
- The niveau-1 frontier marks (`optional: true` + `frozenWhenPublished: false`, ADR 0037) stay on the same 14 nodes, resolved by longest suffix, so the same nodes gate publication and unlock after it; root and family carry no mark, so both are frozen and neither is a publish stop.
- The admin form defaults a draft's `materialPath` to the root and locks `materialPath[0]` for every role, so the first real choice is the family.
- The legacy import prefixes the root once and drops a classification it can only place at the bare root.

### Rejected

- A UI-only root, shown in the form without touching the vocabulary or storage: two path shapes to reconcile at every boundary (validation, facets, `/service`, legacy import), and the coming siblings force the storage change anyway.

## Consequences

- Two public contracts change: `/service` POST `material` and the public `?material=` facet param require the `rock_and_sediment.` prefix, an un-rooted facet value being dropped.
- `frozenMaterialDepth` goes from 1 to 2 for rock, sediment and extraterrestrial paths.
- `material_missing` is unreachable from the admin form, since a draft always carries the root; `/service` POST, which may omit the material, still reaches it.
- The public site shows the root as one more facet level and a leading breadcrumb crumb (product decision).
- A future liquid or gas kind is a sibling root in `MATERIAL_ROOTS`, never a child of `rock_and_sediment`.
