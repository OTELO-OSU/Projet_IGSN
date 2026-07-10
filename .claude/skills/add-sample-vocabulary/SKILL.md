---
name: add-sample-vocabulary
description: Use when adding or extending a hierarchical dot-path vocabulary for samples (material classification, sample type, collection method, or any tree-shaped controlled vocabulary) in packages/domain. Covers the shared segment-keyed TreeNode shape, the path helpers, the three completeness policies, i18n label maps, publishability, and the tree-enumerating specs.
---

# Add a node to a sample vocabulary tree

`packages/domain/src/sample/` holds three hierarchical vocabularies: material
(`material/classification.ts`), `type` (`type/vocabulary.ts`), and
`collectionMethod` (`collection-method/vocabulary.ts`). Each is a dot-joined path
of `lower_snake_case` codes stored as Postgres `ltree` (ADR
[0008](../../../docs/adr/0008-taxonomies-as-materialized-paths.md),
[0010](../../../docs/adr/0010-ltree-material-classification.md),
[0011](../../../docs/adr/0011-material-vocabulary-as-tree.md)). An ancestor path
(`rock`, `coring`) is a valid partial value.

**All three share one shape**: a segment-keyed tree of `TreeNode`
(`{ label, choices?, optional? }`), `satisfies Record<string, TreeNode>`, widened
to `Record<Key, TreeNode>`, expanded by `expandPaths(TREE, ROOTS)`, validated by a
Zod `.refine` against that list. Navigated by the generic helpers in `path/`:
`pathSegment`, `pathChildren`, `isPathLeaf`, `isPathComplete(paths, path, isOptional)`
(the `isOptional` callback is each vocabulary's completeness policy).

Adding a node is **pure data**: no migration, no UI change. Follow TDD (spec first).

## How the three differ

|                 | material                                                  | `type`                         | `collectionMethod`                          |
| --------------- | --------------------------------------------------------- | ------------------------------ | ------------------------------------------- |
| Authored in     | `classification.ts` roots + `classification/*-subtree.ts` | inline `vocabulary.ts`         | inline `vocabulary.ts`                      |
| Completeness    | per node: optional unless `optional: false`               | leaf-only                      | none: every node is a valid stop            |
| Gates publish?  | yes (`isMaterialComplete`)                                | yes (`isSampleTypeComplete`)   | no                                          |
| Admin label map | `material-path-label.ts` (dynamic lookup)                 | `type-label.ts` (typed Record) | `collection-method-label.ts` (typed Record) |
| i18n key        | bare code (`rock`)                                        | `type_*`                       | `collection_method_*`                       |

The `optional` flag only bites in material; the others have a vocabulary-wide
policy and ignore it.

## Material source screenshots

Material usually arrives as a color-legended screenshot:

- **Pink = mandatory**: parent is not a valid stop, give it `optional: false`.
- **Yellow = optional**: valid stop, leave `optional` off. Leaves are always stops.

Ambiguous or unlegended color: ask, do not guess.

## Code identity

A code is one `lower_snake_case` string, no type prefix (the path gives context).
A code may recur under several parents (full path is the identity). To reuse a
code as a childless leaf under a parent that also has it as an inner node, add a
dotted override key (`"core.core": { label: "core" }`) so `expandPaths` stops there.

**Duplicates across ALL subtrees.** Material spreads fragments
(`{ ...rockTree, ...sedimentTree }`): a bare key defined twice is not a compile
error, the later spread silently shadows the earlier. Grep a new key across
`classification.ts` and every `classification/*-subtree.ts` (and its i18n key)
first. Shared leaves like `other` live once, in the assembler.

**Conflict = STOP and ask.** Already a key anywhere in the tree (or its i18n
key)? Do not rename or silently reuse. Ask.

## Self-referencing node (`Core > Core`)

A node can list itself as a child: `Core > Core`. Put the literal `"core"` in
`core`'s `choices` like any other child, then add a dotted override key to stop
recursion:

```ts
core: { label: "core", choices: ["core", "half_round", /* ... */] },
"core.core": { label: "core" }, // childless override terminating core.core
```

`expandPaths` resolves each node by the longest matching suffix, so `core.core`
hits this childless leaf, not bare `core`, and stops. Without it the walk cycles
(`core.core.core...`) and throws `Path tree cycle` at import, reddening every
spec. The dotted key is excluded from `SampleTypeSegment`, so labels still key by
bare segment (`core.core`'s label is the `core` message).

Picker options come from `SAMPLE_TYPES` (the `expandPaths` output), so prove the
value is selectable in the spec:

```ts
expect(SAMPLE_TYPES).toContain("core.core");
expect(SAMPLE_TYPES).not.toContain("core.core.core");
expect(sampleTypeSchema.safeParse("core.core").success).toBe(true);
```

## Workflow

1. **Spec first (red).** Add accept/reject cases to that vocabulary's specs:
   - material: `material/classification.spec.ts`, `material/children.spec.ts`,
     `material/is-complete.spec.ts` (+ `segment.spec.ts` if segment behavior changes).
   - `type`: `type/vocabulary.spec.ts`, `type/is-complete.spec.ts`, `type/segment.spec.ts`.
   - `collectionMethod`: `collection-method/vocabulary.spec.ts`, `collection-method/segment.spec.ts`.
   - Shared child/leaf/expand behavior: `path/*.spec.ts`.

2. **Add the node.** `type`/`collectionMethod` are inline in one `vocabulary.ts`.
   Material is split: `classification.ts` holds the roots and shared `other` leaf
   and spreads per-root fragments (`classification/rock-subtree.ts`,
   `classification/sediment-subtree.ts`); add a node to its root's fragment (a new
   root or cross-subtree leaf goes in `classification.ts`, a dotted override next
   to its parent). Each fragment has its own `satisfies Record<string, TreeNode>`.

   Add the key, add its literal to the parent's `choices` (a root: to the roots
   array), and set `optional: false` if material and pink. A mistyped `choices`/root
   literal fails the tree spec (`should define the child`) or the `satisfies` guard.

   ```ts
   export const rockTree = { igneous: { label: "igneous" } } satisfies Record<
     string,
     TreeNode
   >;
   // classification.ts: const materialTree = { rock: {...}, ...rockTree } satisfies ...
   ```

3. **Label.** Add the English message to `packages/design-system/messages/en.json`,
   then wire the admin label map:
   - `type` / `collectionMethod`: add `<code>: m.<key>` to the typed Record in
     `type-label.ts` / `collection-method-label.ts`. Compile-enforced.
   - material: `material-path-label.ts` looks up dynamically (raw-code fallback),
     so it is NOT compile-enforced, but `material-path-label.spec.tsx` asserts
     every key exists. Miss the `en.json` entry and it goes red.

4. **Publishability.** Nothing to wire: `type`/material inherit their gate via
   `isSampleTypeComplete` / `isMaterialComplete`; `collectionMethod` never blocks.
   (A whole new vocabulary with its own gate needs a code in `publishBlockerSchema`,
   per `.claude/rules/architecture.md`.)

## Verification gate

```
pnpm lint:check
pnpm test --project @projet-igsn/domain --project @projet-igsn/admin --project @projet-igsn/frontend
```

All green. `expandPaths` cycle error = a `choices` points up its ancestry;
missing-key type error = a `choices`/root is not a tree key. Not done until the
label renders (not the raw code) in the picker.
