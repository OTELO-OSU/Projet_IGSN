---
type: guide
title: Updating the sample declaration form
description: >-
  Every form change starts in domain: a vocabulary value, a characteristic
  sub-schema, or a display condition, then admin, i18n and the publish decision.
resource: docs/updating-the-sample-form.md
tags:
  - guide
  - forms
  - sample
relations:
  - type: depends_on
    target: zod-single-source-of-truth
  - type: depends_on
    target: form-kit-and-hidden-values
  - type: depends_on
    target: vocabulary-tree
  - type: depends_on
    target: published-field-locks
status: stable
---

The developer-facing guide for changing the sample declaration form (`docs/updating-the-sample-form.md`). Every change starts in `domain` ([[zod-single-source-of-truth]]), so it reaches the form, the api and the public app at once.

**Add or remove a selector value** (material, type, collection method): pure data, no migration and no UI change ([[vocabulary-tree]]).

1. Add the code to the tree, as a node keyed by its `lower_snake_case` code plus its key in a parent's `choices`.
2. Add its label to the shared messages ([[i18n-strategy]]); coverage is a build gate.
3. Add test cases.

**Add or remove a characteristic:**

1. `domain`: define the sub-schema and wire it into `createSampleSchema`.
2. `admin`: build the field with the form kit and map it into the flat draft ([[form-kit-and-hidden-values]]).
3. i18n: add the strings.
4. Publish: make it required, if it should be, by adding a code to the blockers ([[publish-blockers]]).
5. Publish: decide whether it can still change after publication, one entry in the lock maps ([[published-field-locks]]); a hierarchy field freezes per node instead ([[material-levels-editable]]).

**Add or remove a display condition**: the render gate and the compose exclusion ride one shared helper, per the hidden-value rules.

Then verify: the guide's own verification steps, plus `pnpm test` and `make test-e2e` when app code changed ([[testing-strategy]]).
