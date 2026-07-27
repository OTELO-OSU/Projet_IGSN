# Updating the sample declaration form

This guide is for a developer changing the form: adding a selector value, a characteristic, or a display condition.

## A few terms first

If TypeScript is not your daily language, three words show up throughout:

- **Schema**: a description of what a valid value looks like (this field is text, that one is a number, this one is optional). We use a library called Zod for it. The form and the API both check data against the same schema, so there is one source of truth and no drifting copies.
- **Record keyed by code**: an object used as a lookup table. The key is a short machine code like `rock` or `granite`; the value is that entry's data. Think of a dictionary: you look things up by their code.
- **Path**: a chain of codes joined by dots, like `rock.igneous.plutonic`. It reads left to right, general to specific, the way you drill down a menu.

## Mental model

`domain` owns the logic. Every rule about a sample (its schema, the vocabulary trees, what a valid path is, what blocks publication) lives once in `packages/domain` and has no I/O. `api`, `admin`, and `frontend` never restate a rule: `api` implements the domain interfaces against the database, and `admin`/`frontend` import the same domain schemas to build and validate their forms. So a change made in `domain` reaches the form, the API, and the public app at once, and none of them can drift from another. This is why every step below starts in `domain`.

The form has no schema of its own. The write contract is `createSampleSchema` ([../packages/domain/src/sample/sample.ts](../packages/domain/src/sample/sample.ts)), composed from one sub-schema per characteristic. The admin form keeps a flat draft that `composeCreateSample` ([../packages/admin/src/samples/sample-draft-schema.ts](../packages/admin/src/samples/sample-draft-schema.ts)) validates against that same schema. Change the domain schema and the form follows.

"Required" means required to **publish**, not to save. You can save a half-filled draft and finish it later. Publish requirements live in `samplePublishBlockers` (`../packages/domain/src/sample/publication/`), never in the draft schema.

## Add/remove a selector value

Material, type, and collection method are dot-path vocabulary trees. Adding a value is pure data: you edit a lookup table, with no database migration and no UI change.

Each tree is a record of nodes keyed by their `lower_snake_case` code. A node holds three optional fields:

```ts
type TreeNode = {
  label?: string; // usually omitted: the code is its own label key
  choices?: readonly string[]; // the child codes, when it has children
  optional?: boolean; // true if stopping here is a valid, publishable choice
};
```

The three trees:

- [material/classification.ts](../packages/domain/src/sample/material/classification.ts)
- [type/vocabulary.ts](../packages/domain/src/sample/type/vocabulary.ts)
- [collection-method/vocabulary.ts](../packages/domain/src/sample/collection-method/vocabulary.ts)

### 1. Add the code to the tree

A **leaf** (a value with no children) is just its string in the parent's `choices` array. To add `syenogranite` under `plutonic.felsic`:

```ts
// packages/domain/src/sample/material/classification/rock-subtree.ts
"plutonic.felsic": {
  label: "felsic",
  choices: ["granite", "granodiorite", "tonalite", "trondhjemite", "syenogranite"],
  //                                                              ^ added
},
```

A **node with children** gets its own entry that carries `choices`. Say you add a `porphyry` value under `plutonic.felsic` that itself splits further:

```ts
"plutonic.felsic": {
  label: "felsic",
  choices: ["granite", "granodiorite", "tonalite", "trondhjemite", "porphyry"],
},
// new entry for the value you just referenced above:
porphyry: {
  choices: ["granite_porphyry", "quartz_porphyry"],
},
```

**Bare code or dotted key?** A node is resolved by the longest matching suffix of its path: for `rock.igneous.plutonic.felsic` the keys `rock.igneous.plutonic.felsic`, `igneous.plutonic.felsic`, `plutonic.felsic`, `felsic` are tried in order, first hit wins. Key a node by its **bare code** (`porphyry`) when that code means the same thing everywhere it appears. Use a **dotted key** (`plutonic.felsic`) only when the same code recurs under more than one parent with different data: `felsic` sits under both `plutonic` (granite, granodiorite...) and `volcanic` (rhyolite, dacite), so each branch needs its own entry to carry the right `choices`. A childless leaf that carries no special data needs no entry at all: it resolves to itself, labelled by its own code.

A dotted key is also how you **stop a walk that would otherwise recurse forever**. When a code that has children needs to be a plain leaf in one context, a childless dotted override ends the branch there. If a bare code appears among its own descendants (`core` under `core`), the suffix match would keep resolving `core.core.core...` back to the same children-bearing node, and `expandPaths` throws `Path tree cycle` ([expand-paths.ts](../packages/domain/src/sample/path/expand-paths.ts)). Defining `core.core` (or a real case like `hydrothermal.carbonate`, `lunar_sample.rock`) as a leaf, `{ label: "core" }` with no `choices`, makes the deeper path resolve to the leaf instead and terminates the walk. So reach for a dotted key both to specialise a branch and to guard against a bare code accidentally grafting its whole subtree, or itself, where it should stop.

A **new root** (a top-level entry point, not nested under anything) goes in that tree's roots array instead:

```ts
// packages/domain/src/sample/material/classification.ts
export const MATERIAL_ROOTS = [
  "rock",
  "sediment",
  "mineral",
  "fossil",
  "synthetic_rock_mineral",
  "extraterrestrial_rock",
  "meteorite_fall", // added
] as const;
```

A **reused subtree** grafts an existing branch under a new parent without copying it: name the branch's codes in `choices` and stop. Because resolution is by longest suffix and the full path is the identity, every override already defined for those codes keeps applying under the new parent. The metamorphic branch reuses the igneous and sedimentary trees this way:

```ts
// packages/domain/src/sample/material/classification/metamorphic-subtree.ts
meta_igneous_rock: {
  choices: ["plutonic", "volcanic"], // grafts in the whole igneous subtree
},
// no plutonic.felsic etc. redefined here: the existing overrides resolve
// under meta_igneous_rock.plutonic.felsic by longest suffix (plutonic.felsic)
```

So a path like `rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite` walks all the way to the same `granite` leaf as the plain igneous path, reusing `plutonic.felsic`'s children with zero duplication. All subtrees spread into one flat record ([classification.ts](../packages/domain/src/sample/material/classification.ts)), so each code is defined once and every graft points at that single definition. If a grafted branch must behave differently under its new parent, do not touch the shared code: add a dotted key scoped to the full branch path (`meta_igneous_rock.plutonic.felsic`), which the longest-suffix match picks up only in that context.

**`optional: true`** marks a node where stopping is a complete, publishable answer on its own. Without it, a node that has children must be refined deeper before the sample can be published. Leaves are always valid stops.

### 2. Add its label

Every code needs a human-readable label, in every language file. The key is `<prefix>_<code>`, where the prefix names the tree (`material_`, `type_`, or `collection_method_`):

```jsonc
// packages/domain/messages/en.json
"material_syenogranite": "Syenogranite",
// packages/domain/messages/fr.json
"material_syenogranite": "Syénogranite",
```

A code reused under several parents shares one key: translate it once. If you forget a label, the label-coverage spec fails the build rather than showing a raw code to a user.

### 3. Add test cases

Add one accept case and, where relevant, one reject case to that tree's spec (the `*.spec.ts` file beside it):

```ts
it.each(["rock.igneous.plutonic.felsic.syenogranite"])(
  "should accept %s",
  (path) => {
    expect(materialPathSchema.safeParse(path).success).toBe(true);
  },
);
```

### Removing a value

Delete its code from `choices` (or the roots array), its label in every language file, and its spec cases. Warning: a code still stored on an existing sample becomes invalid the moment you remove it, so only remove values nothing uses.

## Add/remove a characteristic

A whole new field (not just a value inside an existing one). Do the domain first, then the admin form.

### 1. Domain: define and wire the sub-schema

Add the field's schema and plug it into `createSampleSchema` in [sample.ts](../packages/domain/src/sample/sample.ts). Use `.nullish()` (allows null or missing) so a partial draft still saves:

```ts
// the field's own schema, in its entity folder e.g. sample/grain-size/model.ts
export const grainSizeSchema = z.enum(["fine", "medium", "coarse"]);

// wired into createSampleSchema in sample.ts
export const createSampleSchema = z.strictObject({
  name: nameSchema,
  nature: natureSchema,
  // ...existing fields...
  grainSize: grainSizeSchema.nullish(), // added: optional so a draft still saves
});
```

### 2. Admin: build the field and map it into the draft

Add a field component under `packages/admin/src/samples/`, place it in [sample-form.tsx](../packages/admin/src/samples/sample-form.tsx), and map it in `composeCreateSample` ([sample-draft-schema.ts](../packages/admin/src/samples/sample-draft-schema.ts)).

`composeCreateSample` turns the form's flat draft into the domain shape. Add your field there, and add it to the `SampleDraft` type and `toSampleDraft` (which seeds the form from a saved sample):

```ts
// in the SampleDraft type
grainSize: CreateSample["grainSize"] | undefined;

// in toSampleDraft (initial + reset values)
grainSize: value?.grainSize,

// in composeCreateSample's returned object
...(draft.grainSize ? { grainSize: draft.grainSize } : {}),
```

Reuse the design-system form inputs (`TextField`, `ComboboxField`...). If the kit lacks the input type you need, add it to `packages/design-system/src/components/form/` so every form gets it, never inline a one-off input.

### 3. i18n: add the strings

Add the field's label and any error strings to the language files. No user-facing string is hardcoded; every one goes through the translation catalog.

### 4. Publish: make it required, if it should be

Only if the sample cannot be published without this field. Add a code to `publishBlockerSchema`, push it in `samplePublishBlockers`, and translate the admin label map. The label map is exhaustive, so it fails to compile (and thus reminds you to translate) until you add the entry.

## Add/remove a display condition

Background: ADR [0015](adr/0015-form-hidden-value-lifecycle.md) / [0016](adr/0016-undetermined-location-requirement.md).

Rule of thumb: **hide** a field only when it belongs to the other branch of an exclusive choice. A field that is simply not relevant yet stays visible but disabled, so the form shows every question upfront and none appears by surprise.

To hide, wrap the field in `form.Subscribe` and return `null` for the branch where it does not apply. This is exactly how the texture selector only appears for igneous materials:

```tsx
// packages/admin/src/samples/texture-field.tsx
<form.Subscribe selector={(state) => state.values.materialPath}>
  {(materialPath) => {
    const textures = texturesFor(composeHierarchyValue(materialPath ?? []));
    if (textures.length === 0) return null; // not igneous: hide the field
    // ...otherwise render the selector...
  }}
</form.Subscribe>
```

Two things that must go with any hide:

- **A matching exclusion in `composeCreateSample`.** A hidden field keeps its value in the form store (so switching back restores it), but on save the compose step must drop it. Miss this and a hidden value reaches validation and fails silently: the save errors with no message the user can see or fix.
- **Toggle the required marker with `withRequired`** if the field is a conditional publish requirement, so the trailing `*` appears exactly when the requirement holds.

A requirement driven by another field (for example `locationRequirement(material)`) lives in `domain`, so the form and the publish tooltip always agree.

## Verify

```
pnpm lint:check
pnpm test --project @projet-igsn/domain --project @projet-igsn/admin --project @projet-igsn/frontend
```
