# Drop the remaining `X > X` self-children from the vocabularies

## Context

Commit b4df5cd8 replaced the sample type `core.core` by `core` alone, marking `core` `optional: true` so stopping at the parent is the valid choice. The same `X > X` pattern (a node listing itself as a child, terminated by a childless dotted override `"x.x": { label: "x" }`) still exists elsewhere. The goal is to find every such case and remove it the same way.

## Findings

A scratch scan of every expanded path set (`MATERIAL_PATHS`, `SAMPLE_TYPES`, `PHYSIOGRAPHIC_ENVIRONMENTS`, `RESOURCE_TYPE_PATHS`, `COLLECTION_METHODS`, `STRUNZ_PATHS`; `REGION_HIERARCHY` has only country/ocean leaves) found consecutive repeated segments in **one vocabulary only**, collection method. The 5 self-children, all in [vocabulary.ts](packages/domain/src/sample/collection-method/vocabulary.ts):

| Path                                 | Self-child entry in `choices`   | Override key |
| ------------------------------------ | ------------------------------- | ------------ |
| `coring.coring`                      | `coring` choices line 11        | line 32      |
| `coring.gravity_corer.gravity_corer` | `gravity_corer` choices line 36 | line 46      |
| `coring.piston_corer.piston_corer`   | `piston_corer` choices line 49  | line 51      |
| `dredging.dredging`                  | `dredging` choices line 55      | line 57      |
| `grab.grab`                          | `grab` choices line 60          | line 63      |

All five parents already carry `optional: true`, so nothing in `is-complete`/publish blockers changes: the parent alone is already a valid, publishable stop.

Every other reference to those five paths (outside `.claude/worktrees/`, which is not main):

- [vocabulary.spec.ts:19](packages/domain/src/sample/collection-method/vocabulary.spec.ts#L19) accepts `coring.piston_corer.piston_corer`; line 36 rejects `coring.piston_corer.piston_corer.piston_corer`.
- [sample-list-page.spec.tsx:180-190](packages/admin/src/samples/sample-list-page.spec.tsx#L180-L190) filters on `coring.coring` by clicking the second "Coring" button.
- [seed-demo-samples.ts:785](packages/api/scripts/seed-demo-samples.ts#L785) seeds `grab.grab`.
- [SKILL.md:94-100](.claude/skills/add-sample-vocabulary/SKILL.md#L94-L100) "Self-referencing node" section, which already (wrongly) claims no vocabulary uses it.
- [updating-the-sample-form.md:70](docs/updating-the-sample-form.md#L70) explains the dotted override with the `core.core` example.

No e2e spec, legacy import mapping, frontend code, admin code or i18n file names a self-child path (labels key by last segment, so `collection_method_coring` etc. stay in use for the parent).

## Changes (mirror of b4df5cd8)

1. `packages/domain/src/sample/collection-method/vocabulary.ts`: remove the 5 self entries from `choices` and the 5 `"x.x": { label: "x" }` override keys. Parents keep `optional: true`.
2. `packages/domain/src/sample/collection-method/vocabulary.spec.ts`: replace `coring.piston_corer.piston_corer` in the accept list by `coring.piston_corer`; add `coring.coring` and `grab.grab` to the reject list; keep the `...piston_corer.piston_corer.piston_corer` rejection or drop it as redundant.
3. `packages/admin/src/samples/sample-list-page.spec.tsx`: filter case becomes `coring.box_corer` (or keep `coring` via the first "Coring" button) so the test no longer picks a second "Coring" row.
4. `packages/api/scripts/seed-demo-samples.ts:785`: `grab.grab` -> `grab`.
5. New migration `packages/api/migrations/2026MMDDHHMMSS-merge-self-child-collection-methods.ts`, modelled on `20261005100000-merge-core-core-sample-type.ts`: one `update sample set collection_method = subpath(collection_method, 0, nlevel(collection_method) - 1) where collection_method in ('coring.coring', 'coring.gravity_corer.gravity_corer', 'coring.piston_corer.piston_corer', 'dredging.dredging', 'grab.grab')` (ltree column; `collection_method_paths` is GENERATED so it follows). Empty `down`.
6. Docs: `.claude/skills/add-sample-vocabulary/SKILL.md` "Self-referencing node" section: shrink to the mechanism, state no vocabulary uses it (now true); `docs/updating-the-sample-form.md:70`: drop the `core.core` self-recursion example, keep the real dotted-override cases (`hydrothermal.carbonate`, `lunar_sample.rock`); `knowledge/vocabulary-tree.md` and ADR 0012 need no change (they already say collection method marks its non-leaves optional).

No ADR: data-only vocabulary change following the pattern of b4df5cd8.

7. Cleanup: delete `PLAN.md` at the repo root in the last commit of the branch, once every step above has shipped.

## Verification

- `pnpm test --project @projet-igsn/domain` (collection-method specs, publish blockers).
- `pnpm test --project @projet-igsn/admin packages/admin/src/samples/sample-list-page.spec.tsx`.
- `pnpm lint:check --quiet`.
- `make db-migrate` on the dev stack, then re-run the scratch scan (`node --experimental-strip-types scratchpad/repeats.ts` from `packages/domain`) expecting 0 repeats in every set.
- Open the admin collection-method picker: "Coring" offers no second "Coring" row and picking the parent alone still publishes.
