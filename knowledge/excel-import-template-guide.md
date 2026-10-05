---
type: guide
title: Updating the Excel import template
description: >-
  One column registry in columns.ts builds the template, parses the upload and
  drives the bulk-edit export; type, marker, dropdowns and conditions derive
  from createSampleSchema and the domain, so a change is one line plus its Core slot.
resource: docs/updating-the-excel-import-template.md
tags:
  - guide
  - import
  - sample
relations:
  - type: depends_on
    target: zod-single-source-of-truth
  - type: depends_on
    target: publish-blockers
  - type: depends_on
    target: published-field-locks
  - type: depends_on
    target: sample-form-update-guide
status: stable
---

The developer-facing guide for changing the xlsx bulk import (`docs/updating-the-excel-import-template.md`). One registry, `packages/api/src/sample/import-template/columns.ts`, describes every column of every sheet as `{ header, group, path?, block?, level? }`, and everything else derives from it and from `createSampleSchema` ([[zod-single-source-of-truth]]): cell type from the JSON schema, the trailing `*` and the always-required columns from the blockers ([[publish-blockers]]), dropdowns from the domain vocabularies, grey cells from the domain predicates, the export and its frozen cells from the lock maps ([[published-field-locks]]). Every field starts in the form ([[sample-form-update-guide]]).

- **Add a column**: one `field(header, path, block?)` line in the right `grouped()` of `SAMPLE_COLUMNS`; a `CONDITIONAL_FIELDS` entry when the form hides it, calling the same domain helper; fixtures when it is required. The coverage spec in `columns.spec.ts` is red until the column exists.
- **Add a one-to-many relation**: an array field gets its own child sheet in `CHILD_SHEETS`, keyed by `Sample #`, `valueSheet()` for a single value or `KEY_COLUMNS` plus prefixed paths for a multi-field element; the join, the lookup and the export rows are automatic.
- **Add a controlled vocabulary**: a `flat()` or `hierarchy()` block in `vocabulary-sheet.ts` named by the column's `block`, labels from `createSampleLabels`; a value in an existing vocabulary needs nothing.
- **Change the grouping**: `group` is row 1, merged over contiguous runs, mirroring the form tabs; order is array order and uploads match by header name.
- **Remove a column**: delete the line, satisfy the coverage spec (schema field gone or listed in `EXCLUDED`), drop its condition, block, default and fixtures; stale templates stay valid, but renaming a header is a removal for every downloaded file.
- **Drift**: `createSampleSchema` is the one truth; Excel is guarded by `columns.spec.ts`, the form by the compiler over `SampleDraft`, `/service` by the field coverage test in `core-path.spec.ts`.
