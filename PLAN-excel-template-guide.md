# Plan: maintainer guide for the Excel import template

## Context

A future maintainer has no written walkthrough of the xlsx import template. The code is well factored (one column registry, everything else derived), and ADR 0051 fixes the upload contract, but nothing tells a developer adding a Sample field that a template column, a vocabulary block, a child sheet or a Core mapping is also theirs to add. Today no skill, rule or guide mentions `columns.ts`, and the only maintainer guide (`docs/updating-the-sample-form.md`) stops at the form. The user asked for one doc answering: add a column, add a one-to-many sheet, add a controlled vocabulary, change grouping, remove a column, avoid drift between Excel, form and `/service`, plus any other maintenance point.

Branch `doc/excel-template`, no commits yet. Documentation only, no runtime change, so no e2e run and no ADR (no new decision; the guide records existing ones).

## Deliverables

1. **`docs/updating-the-excel-import-template.md`** (new): the guide, same shape and voice as `docs/updating-the-sample-form.md` (terms first, mental model, one section per task with numbered steps, a verify block). English, follows `.claude/rules/writing-style.md` (no em dashes, bullets over paragraphs, no hard wraps).
2. **`knowledge/excel-import-template-guide.md`** (new) plus one line in `knowledge/index.md` under `# guide` and one `**Creation**` line in `knowledge/log.md`: the knowledge twin every existing guide has (`sample-form-update-guide.md`, `sync-institutions-import.md`), frontmatter `type: guide`, `resource: docs/updating-the-excel-import-template.md`, relations `depends_on` `zod-single-source-of-truth`, `publish-blockers`, `published-field-locks`, `sample-form-update-guide`.
3. **One cross-link** (user's choice, no skill or CLAUDE.md edits): `docs/updating-the-sample-form.md`, "Add/remove a characteristic", gains a step 6 "Template and service: a new field also needs its Excel column and its Core slot, see [updating-the-excel-import-template.md](updating-the-excel-import-template.md)".
4. **Core drift spec** (user's choice): one new `it` in `packages/domain/src/sample/core/core-path.spec.ts`, mirroring `columns.spec.ts`'s coverage test, through the public `toCorePath` only (`CORE_PATH_BY_FIELD` stays private, an unmapped path comes back unchanged):
   ```ts
   const NOT_IN_CORE = ["localIdDescription", "attachments"];
   it("should map every createSampleSchema field but the ones Core has no slot for", () => {
     const unmapped = Object.keys(createSampleSchema.shape).filter(
       (field) => !NOT_IN_CORE.includes(field) && toCorePath(field) === field,
     );
     expect(unmapped).toEqual([]);
   });
   ```
   Top-level keys, not leaves: longest-prefix matching means a mapped parent covers every leaf under it by design, so the drift risk is a whole new field. Verified against the 36 keys of `createSampleFieldsSchema`: only `localIdDescription` and `attachments` are unmapped today, both already in the round-trip spec's `UNMAPPED_SAMPLE_FIELDS`. The guide's drift table then names this spec as the `/service` guard, and the checklist says "add the Core slot, or the field to `NOT_IN_CORE` with a reason".

## Document structure (`docs/updating-the-excel-import-template.md`)

The headings of the future doc, in order. Each answers one of the user's questions; the detail of what each says follows in the next section.

1. **Updating the Excel import template** (title + one line: who the guide is for, what the template is, that download, upload, export and bulk edit share one registry)
2. **A few terms first**: column registry, path, block, child sheet, pre-fill, blocker
3. **Mental model**: one registry (`columns.ts`), everything else derived from it and from `createSampleSchema`; the derivation table; the upload flow; the ADR 0051 contract to keep
4. **Add a column**: 9 numbered steps (field exists in domain and form → one `field()` line → nothing for type and marker → dropdown block → condition → optional section → fixtures when required → export is automatic → Core)
5. **Add a one-to-many relation (a child sheet)**: when the schema field is an array, `valueSheet` vs multi-column element, the steps, scalars beside the array, export and bulk-edit semantics, tests, the `Name` in column B gotcha
6. **Add a controlled vocabulary**: a value in an existing vocabulary (nothing), a new flat vocabulary, a new hierarchy, labels with no domain resolver, dynamic lists, the Core slot
7. **Change the column grouping**: `group` and `COLUMN_GROUPS`, contiguous runs, mirroring the form tabs, customization sections, moving a column
8. **Remove a column**: 4 numbered steps (delete the line and satisfy the coverage spec → remove its condition, block, default, fixtures → old files are safe → renaming is removal plus addition)
9. **Avoid drift between Excel, form and /service**: the three-faces table with each face's derivation and guard, one condition one helper, required never hand-listed, labels, and the new-field checklist table
10. **Other maintenance points**: long-lived templates and no version gate, customization `C1`, `IMPORT_DEFAULTS`, issue codes, Excel limits, `queueBuild`, attachments, sub-samples, legacy import is separate, rate limits, reading list
11. **Verify**: the lint and test commands

## Guide outline (what each section says, with the code it cites)

### A few terms first

- Column registry, block, path, child sheet, pre-fill, blocker. Short, for a non-TS reader like the form guide.

### Mental model

- Everything lives in `packages/api/src/sample/import-template/` and `bulk-edit/`; `domain/sample/import/` holds only what admin shares (header row, required marker, sheet and file names, issue codes, section keys). `admin` never parses the workbook (ADR 0051).
- **One registry**: `columns.ts`. A `Column` is `{ header, group, path?, block?, level? }`; `SAMPLE_COLUMNS` is the Samples sheet, `CHILD_SHEETS` the one-to-many tabs, `DATA_SHEETS` both.
- **Everything else derives from the registry and the domain schema**, table form:
  | Concern | Derived by | From |
  | cell type (string/number/boolean), array membership | `column-kind.ts` `COLUMN_KINDS` | `z.toJSONSchema(createSampleSchema)` |
  | `*` marker | `marked()` in `columns.ts` | `PUBLISH_BLOCKER_PATH`, level 1 only |
  | column whose absence refuses the file | `required-columns.ts` | `createSampleSchema.safeParse({})` + `samplePublishBlockers` + hierarchy frontier, minus conditional fields and `IMPORT_DEFAULTS` |
  | dropdown and Vocabularies sheet | `vocabulary-sheet.ts` block matched by `block` (+ `_level`) | domain constants + `labels.ts` (English catalog through `createSampleLabels`) |
  | grey cells, prompts, columns dropped by customization | `conditional-fields.ts` | domain helpers (`texturesFor`, `isMetamorphicRock`, `allowsLocation`...) |
  | parse: header match, rows, join, values | `template-layout.ts`, `read-rows.ts`, `build-sample-inputs.ts`, `resolve-label.ts` | the same blocks |
  | validate | `validate-samples.ts` | `publishedSampleSchema`, issues placed back on sheet/row/column via `rowsByPath` |
  | export and bulk edit | `bulk-edit/export-columns.ts`, `sample-row.ts`, `merge-stored-sample.ts` | same columns; frozen from `published-field-lock.ts` |
- Flow: download (customized or not) → fill → upload → layout → rows → inputs → `publishedSampleSchema` → queue as `publishing` (ADR 0052). Whole-file 422 with `{ sheet, row, column, value, code }` issues.
- Contract to keep (ADR 0051): headers matched by name on row 2, never position; no version gate, so every downloaded template stays uploadable; label or raw code accepted; server validates alone.

### Add a column

1. The field exists in `createSampleSchema` and the form first (link form guide). The template coverage spec (`columns.spec.ts` "should carry a column for every createSampleSchema leaf") is already red at this point, that is the reminder.
2. One line in the right `grouped(...)` of `SAMPLE_COLUMNS`: `field("Human header", "path.to.leaf", "block?")`. Header unique per sheet, English, no dot, no schema path (spec). Position in the array is the position in Excel.
3. Nothing for the type, the marker, or the mandatory check: all derived. Note dates: an Excel date cell is written as `YYYY-MM-DD`, or to the minute when a sibling `precision` column says "Hour and minute" (`isHourPrecision`).
4. Dropdown: give it a `block` (see vocabulary section). Yes/no fields use `"yes_no"`.
5. Condition: if the form hides the field under a condition, add a `CONDITIONAL_FIELDS` entry calling the same domain helper (`condition` greys, prompts, excludes from mandatory, drops when a customization makes it unreachable; `prompt` alone is a hint). `values` are labels, never codes (spec). A provenance-exclusive field is caught by `conditional-fields.spec` if forgotten.
6. Optional section: a column inside an existing group is already a flag's. A new section means a key in `TEMPLATE_SECTION_KEYS` (domain), `TEMPLATE_SECTIONS` (columns.ts), `SECTION_LABELS` in `customize-template-dialog.tsx`, the api validator; all exhaustive records, the build fails until done.
7. Fixtures when the field is required: `import-fixture.ts` `CLEAN_SAMPLE`/`CLEAN_INPUT` (shared by every api spec and by `scripts/write-clean-import.ts`, which generates the e2e clean file inside the api container), `required-columns.spec.ts` literal list, e2e `fillPublishableFields` and `seed-demo` (memory: new blockers break those two).
8. Export: automatic. Frozen cell greying and `frozen_field` refusal follow `published-field-lock.ts`; only `igsn`/`parents.igsn` are special-cased in `export-workbook.ts`.
9. Core: separate face, see drift section.

### Add a one-to-many relation (a new child sheet)

- When: the schema field is `z.array(...)`. `COLUMN_KINDS` gives its leaves an `arrayPrefix`; `withChildRow` folds every row's fields sharing that prefix into one appended element, and `rowsByPath["prefix.i"]` points an issue back at that row.
- Single-value array (organisations, elements): `valueSheet(SHEETS.x, group, header, path, block)`.
- Multi-column element (relations, process steps): `marked([...KEY_COLUMNS, ...grouped(group, [field(..., `${PREFIX}.leaf`)])])`.
- Steps: add `SHEETS.<name>` (31-char Excel limit), build the columns starting with `KEY_COLUMNS`, append to `CHILD_SHEETS` (array order = tab order), done. `addChildSheet` adds the `Sample #` list validation and the name `VLOOKUP`; the Read me line listing tabs updates itself; a sheet left with only key columns after customization is dropped automatically.
- Scalars allowed beside the array on a child sheet (storage-condition readings): set once per sample, a second differing value is `duplicate_value`.
- Export: `childRows` derives; attachments are the one tab excluded (`EXPORT_CHILD_SHEETS`). Bulk edit: an absent sheet keeps the stored values (`withStoredCells`), a present one must carry all its columns, and `mergeStoredSample` overwrites only template paths; a replace-all semantics like process steps needs its own service call (`replace-sample-process-steps.ts`), so say which you want in the PR.
- Tests: extend the `it.each` in `columns.spec.ts` ("several values ... on its own tab"), a join case in `build-sample-inputs.spec.ts`.
- Gotcha: `Name` must stay column B of Samples, the lookup formula is `Samples!$A:$B`.

### Add a controlled vocabulary

- **A value in an existing vocabulary**: nothing here. Blocks read the domain constants; `vocabulary-sheet.spec` fails on a label equal to its code or duplicated within a parent, `workbook.spec` on a validation formula over 255 characters.
- **A new flat vocabulary**: `flat("<block_id>", "Title", CODES, labels.xxxLabel)` in `VOCABULARY_BLOCKS`; the label function comes from `createSampleLabels` (domain, i18n rule), add it there if missing; set `block: "<block_id>"` on the column. Labels must be unique within the block (the parser reverses them).
- **A new hierarchy**: `...tree("path", "block", "Title", PATHS)` in columns and `...hierarchy("block", "Title", PATHS, labelFn)` in blocks; the ids pair as `block_<level>`; cascade and per-parent resolution are automatic. If it can block publication, register its `isComplete` in `required-columns.ts` `HIERARCHIES` or the build throws "No completeness known".
- **Labels with no domain resolver** (yes/no, position type, region kind, date precision): local maps in `vocabulary-sheet.ts`, reused by `conditional-fields.ts`; add one only for form chrome, never for a domain enum.
- **Dynamic lists** (manual groups): the per-request block pattern `manualGroupBlock`, appended in `build()`.
- `/service` publishes the same vocabularies as OpenAPI enums; a new one also needs its Core slot (`core-vocabularies.ts`), see drift.

### Change the column grouping

- `group` on each column is row 1. `mergeGroupRow` merges contiguous runs only, so keep a group's columns adjacent or Excel shows two headers. Order inside a sheet is array order; uploads are order-independent so reordering costs existing files nothing.
- Groups mirror the form tabs on purpose (Read me line 1), "Geological context" being the one section. Rename or add a group in `COLUMN_GROUPS`, and in `TEMPLATE_SECTIONS` if a customization flag drops it. `workbook.spec` checks the run order follows `COLUMN_GROUPS`.
- Moving a column: change which `grouped()` it sits in. Nothing else reads `group`.

### Remove a column

1. Delete its line. The coverage spec now fails unless the schema field is gone too; a field kept in the schema but deliberately off the template goes in `EXCLUDED` in `columns.spec.ts` with its reason (the `*UserId` and deferred fields are there today).
2. Remove its `CONDITIONAL_FIELDS` entries (the spec "every governed path and driving column resolves" fails otherwise), its now-unused block, its `IMPORT_DEFAULTS` entry, its `CLEAN_SAMPLE` cell and any e2e header (`e2e/support/admin/template-workbook.ts`, `sample-import.spec.ts`).
3. Old files: an unknown header is ignored (`sheetLayout` walks template columns only), so removal never refuses a stale template. Bulk edit: a column absent from the upload keeps the stored value.
4. **Renaming a header is a removal plus an addition** for every downloaded file (ADR 0051). For a mandatory column that means `missing_column` on every outstanding template, so avoid it, or announce it.

### Avoid drift between Excel, form and /service

- `createSampleSchema` is the only truth; each face derives and has (or lacks) a guard:
  | Face | Derives | Guard |
  | Excel | columns from the schema leaves, type from JSON schema, `*` from blockers, labels from domain | `columns.spec` coverage test, `column-kind.spec`, `conditional-fields.spec` |
  | Form | `composeCreateSample` validates against the schema, `FIELD_TAB` exhaustive over `SampleDraft`, `*` from `samplePublishRequirements` | compile-time on the draft type, not on the schema |
  | `/service` | `toCoreSample`/`fromCoreSample`, `CORE_PATH_BY_FIELD` | the new `core-path.spec` key coverage test (deliverable 4), `core-round-trip.spec` with a hand-kept `UNMAPPED_SAMPLE_FIELDS` (only exercised for fields a fixture fills), `core-vocabularies.spec` |
- One condition, one helper: form `form.Subscribe` + compose exclusion, template `CONDITIONAL_FIELDS`, schema `checkSample` all call the same domain predicate. The schema is the real guard: the template's `not_applicable` issue is derived from the schema dropping the value (`droppedIssues`), greying is UX.
- Required: never hand-list; the template reads blockers, the form reads requirements, both from `samplePublishRequirements`.
- Labels: vocabulary labels come from the domain catalog in all three; column headers are English strings owned by `columns.ts` and need no i18n (admin shows them raw in the report).
- New-field checklist (one table): schema → form → template column → Core slot + `igsn-core-mapping.md` row → fixtures if required → docs. Each step names its red test.

### Other maintenance points

- Downloaded templates live long and carry no checked version (`TEMPLATE_VERSION` is written to Read me B1 only): a new mandatory column breaks every outstanding file, a new optional one is simply empty.
- Customization is `C1` JSON `{ provenanceStatus, materialPath, manualGroupLabel }` only; flags stay out because headers suffice. A new pre-fill kind touches `storedCustomizationSchema`, `prefillOf`, `possibleLabelsOf`, and blank-row detection `withoutPrefilledRows` (a row equal to its pre-fill plus defaults is not a sample).
- `IMPORT_DEFAULTS`: a default pre-fills the cell and is applied server-side when the column is absent, and removes the column from the mandatory set.
- Issue codes: `importIssueCodeSchema` (domain) + `IMPORT_ISSUE_LABELS` (admin, exhaustive) + `en.json`/`fr.json`; blocker codes label through `publishBlockerLabel`; zod codes fall back to the message.
- Excel limits: validation formula ≤ 255 chars (spec), sheet name ≤ 31, `MAX_IMPORT_ROWS`; dropdown errors are warnings by design; Vocabularies is the only protected sheet.
- `queueBuild` serializes every build and parse (CPU-bound), keep per-cell work cheap.
- Attachments: file names matched exactly against staged uploads (ADR 0054); admin reads that tab client-side through the shared domain header constants only.
- Sub-samples: `Parent IGSN` and `Process steps` exist only with `subSamples`; location and collection date are inherited (ADR 0053) and a filled one is refused.
- Legacy dump import (`scripts/import-legacy.ts`, ADR 0027) is a different mechanism, not this template.
- Rate limits: import and duplicate check 5/min per user.
- Reading list: ADR 0051, 0052, 0053, 0054, `architecture.md` bullets.

### Verify

```
pnpm lint:check
pnpm fmt:check
pnpm test --project @projet-igsn/api packages/api/src/sample/import-template packages/api/src/sample/bulk-edit
```

## Implementation order

1. The Core drift spec in `core-path.spec.ts` (red with an empty `NOT_IN_CORE`, then green).
2. The guide `docs/updating-the-excel-import-template.md`.
3. The step 6 bullet in `docs/updating-the-sample-form.md`.
4. The knowledge twin, its `index.md` line and its `log.md` line.
5. Remove this plan file from the repo root in the last implementation commit, once everything above is committed.

## Verification of this change

- `pnpm fmt:check` (prettier formats markdown) and a re-read of the guide against `writing-style.md`.
- Every file path and symbol in the guide exists (grep each once before committing).
- The Core spec: red first by temporarily adding a fake key to `NOT_IN_CORE`'s complement is not possible without touching the schema, so prove it the other way: run it once with `NOT_IN_CORE = []` and read the two expected names in the failure, then restore the list and run `pnpm test --project @projet-igsn/domain packages/domain/src/sample/core/core-path.spec.ts` green.
- `pnpm lint:check` on the domain package.
- No e2e: the only runtime file touched is a spec.
