# Updating the Excel import template

This guide is about the Excel bulk import of samples. A researcher downloads an xlsx, fills one sample per row and uploads it. The same file format serves the bulk-edit export and its re-import. One column registry, [columns.ts](../packages/api/src/sample/import-template/columns.ts), drives all four. To change what the import asks for, edit that registry and let the rest derive. A new field starts in the declaration form ([updating-the-sample-form.md](updating-the-sample-form.md)). It gets a column here afterwards.

## A few terms first

- **Column registry**: the one list describing every column of every sheet, in [columns.ts](../packages/api/src/sample/import-template/columns.ts). Everything else in the template is computed from it.
- **Path**: where a column's value lands in the sample, as dotted keys (`description.mass.value`). It is the sample's own shape, the one `createSampleSchema` validates.
- **Block**: a named list of allowed values, written once on the "Vocabularies" sheet. A column names the block feeding its dropdown (`nature`, `size_unit`, `material_2`).
- **Child sheet**: a tab for a field a sample can have several of (relations, storage conditions). It holds one value per row, and each row names its sample by its `Sample #`.
- **Pre-fill**: a cell the template already holds when downloaded, grey and fixed. The researcher chose it in the download dialog: a provenance status, a material, a manual group. Or it is a default: existence and availability status.
- **Blocker**: a reason a sample cannot be published, from `samplePublishBlockers` in `domain`. The template marks the columns answering one with a trailing "\*".

## Mental model

The template code lives in `packages/api/src/sample/import-template/` (download and upload) and `packages/api/src/sample/bulk-edit/` (export and re-import). `packages/domain/src/sample/import/` holds only what `admin` must share. That is the header row number, the required marker, the sheet and file names, the issue codes and the customization section keys. `admin` uploads the file and renders the issues it gets back. It never parses the workbook (ADR [0051](adr/0051-excel-import-label-contract.md)).

**One registry.** A column is `{ header, group, path?, block?, level? }` ([columns.ts](../packages/api/src/sample/import-template/columns.ts)). `header` is the English text on row 2 and `group` the text on row 1. `path` is the sample path it writes, `block` the vocabulary feeding its dropdown, `level` its level in a hierarchy. `SAMPLE_COLUMNS` is the "Samples" sheet, `CHILD_SHEETS` the one-value-per-row tabs, `DATA_SHEETS` both. A column with no `path` is a key (`Sample #`) or a lookup.

**Everything else derives from the registry and from `createSampleSchema`.** You never state a type, a requirement or a condition twice:

| Concern                                                  | Computed by                                                                                                                                                                                                                                                                                                                                | From                                                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cell type (text, number, yes/no) and array membership    | `COLUMN_KINDS` in [column-kind.ts](../packages/api/src/sample/import-template/column-kind.ts)                                                                                                                                                                                                                                              | the JSON schema of `createSampleSchema`                                                                                                                                 |
| Trailing "\*" on a header                                | `marked()` in `columns.ts`                                                                                                                                                                                                                                                                                                                 | `PUBLISH_BLOCKER_PATH`, on a hierarchy's level 1 only                                                                                                                   |
| Column whose absence refuses the whole file              | [required-columns.ts](../packages/api/src/sample/import-template/required-columns.ts)                                                                                                                                                                                                                                                      | the schema's own required fields, the unconditional blockers, each hierarchy down to its publish frontier, minus the conditional fields and `IMPORT_DEFAULTS`           |
| Dropdowns and the "Vocabularies" sheet                   | [vocabulary-sheet.ts](../packages/api/src/sample/import-template/vocabulary-sheet.ts), matched to a column by `block` (plus `_<level>` for a hierarchy)                                                                                                                                                                                    | the domain vocabulary constants, labelled through [labels.ts](../packages/api/src/sample/import-template/labels.ts) (the English catalog bound to `createSampleLabels`) |
| Grey cells, input prompts, columns a customization drops | [conditional-fields.ts](../packages/api/src/sample/import-template/conditional-fields.ts)                                                                                                                                                                                                                                                  | the domain predicates (`texturesFor`, `isMetamorphicRock`, `allowsLocation`...)                                                                                         |
| Reading an upload: headers, rows, child join, values     | [template-layout.ts](../packages/api/src/sample/import-template/template-layout.ts), [read-rows.ts](../packages/api/src/sample/import-template/read-rows.ts), [build-sample-inputs.ts](../packages/api/src/sample/import-template/build-sample-inputs.ts), [resolve-label.ts](../packages/api/src/sample/import-template/resolve-label.ts) | the same registry and blocks                                                                                                                                            |
| Validating an upload                                     | [validate-samples.ts](../packages/api/src/sample/import-template/validate-samples.ts)                                                                                                                                                                                                                                                      | `publishedSampleSchema`, each issue placed back on its sheet, row and column through `rowsByPath`                                                                       |
| Export and bulk edit                                     | [export-columns.ts](../packages/api/src/sample/bulk-edit/export-columns.ts), [sample-row.ts](../packages/api/src/sample/bulk-edit/sample-row.ts), [merge-stored-sample.ts](../packages/api/src/sample/bulk-edit/merge-stored-sample.ts)                                                                                                    | the same columns, frozen cells from [published-field-lock.ts](../packages/domain/src/sample/publication/published-field-lock.ts)                                        |

**The upload flow**, `POST /admin/samples/import`:

- `templateLayout` matches the row-2 headers by name.
- `readRows` reads the rows and joins each child row to its sample by `Sample #`.
- `buildSampleInputs` turns the cells into one `createSampleSchema` input per sample.
- Parents are resolved, then `validateSamples` checks each input against `publishedSampleSchema`.
- Any issue answers 422, every issue as `{ sheet, row, column, value, code }`. The admin report translates `code` through [import-issue-label.ts](../packages/admin/src/samples/import-issue-label.ts).
- A clean file queues every sample as `publishing` (ADR [0052](adr/0052-async-import-publication-via-publishing-status.md)).

**The contract to keep** (ADR 0051):

- Columns are matched by header name on row 2, never by position.
- There is no version check: every template ever downloaded must stay uploadable.
- A label or its raw code is accepted in a vocabulary cell.
- The server alone validates. Dropdowns and grey cells are guidance.

## Add a column

For a scalar field of the sample: a text, a number, a yes/no, a code.

### 1. The field exists in `domain` and in the form first

Follow the form guide's "Add/remove a characteristic". Once the field is in `createSampleSchema`, the template coverage spec is red ([columns.spec.ts](../packages/api/src/sample/import-template/columns.spec.ts), "should carry a column for every createSampleSchema leaf"). That failure is your reminder that a column is owed.

### 2. Add one line to the registry

In the `grouped(...)` call of the right group in `SAMPLE_COLUMNS`:

```ts
// packages/api/src/sample/import-template/columns.ts
...grouped("Physical description", [
  // ...
  field("Grain size", "description.grainSize", "grain_size"),
]),
```

- `header`: English, human, unique on its sheet. Never a schema path, never a dot (`columns.spec.ts` checks all three).
- `path`: the schema path, so `COLUMN_KINDS` finds its type.
- `block`: only for a dropdown, see "Add a controlled vocabulary". A yes/no field uses the existing `"yes_no"` block.
- Its place in the array is its place in Excel.

### 3. Nothing to declare for the type, the marker or the required check

A number column parses `Number(cell)`, a text column takes the text, a `yes_no` block gives a boolean. A path in `PUBLISH_BLOCKER_PATH` gets its "\*" and joins the columns whose absence refuses the file. A date cell is written as `YYYY-MM-DD`. It is written to the minute when a sibling `precision` column says "Hour and minute" (`isHourPrecision` in [build-sample-inputs.ts](../packages/api/src/sample/import-template/build-sample-inputs.ts)). So a new date field follows the collection date's shape (`precision`, `start`, `end`, `timeZone`). Otherwise it is read as a day.

### 4. Mirror the form's display condition

The form may hide the field until a sibling holds a value. Then add an entry to `CONDITIONAL_FIELDS`, calling the same domain helper the form calls:

```ts
// packages/api/src/sample/import-template/conditional-fields.ts
{
  paths: ["description.grainSize"],
  condition: material(3, "isNot", (path) => !allowsGrainSize(path)),
},
```

- `condition` greys the cell when the driver column does not match and adds the sentence to the input prompt. It also keeps the column out of the required set. A customized template whose pre-fill can never satisfy it drops the column.
- `prompt` alone adds a sentence with no greying, for a rule Excel cannot evaluate.
- `values` are the labels a cell holds, never codes ([conditional-fields.spec.ts](../packages/api/src/sample/import-template/conditional-fields.spec.ts)).
- A field exclusive to one provenance status is caught by that spec if you forget it.

The schema stays the real guard. A value it drops because its condition fails is reported as `not_applicable`, whatever the greying says.

### 5. Optional sections

A column inside an existing group is already covered by that group's checkbox in the download dialog. A new section touches four places:

- a key in `TEMPLATE_SECTION_KEYS` (`packages/domain/src/sample/import/import-validator.ts`),
- its group in `TEMPLATE_SECTIONS` (`columns.ts`),
- its label in `SECTION_LABELS` (`packages/admin/src/samples/customize-template-dialog.tsx`),
- the api validator.

The records are exhaustive, so the build fails until all four are done.

### 6. Fixtures, when the field is required

- `CLEAN_SAMPLE` and `CLEAN_INPUT` in [import-fixture.ts](../packages/api/src/sample/import-template/import-fixture.ts), the one publishable file every api spec fills. `packages/api/scripts/write-clean-import.ts` writes the same file for the e2e clean import.
- The literal header list in [required-columns.spec.ts](../packages/api/src/sample/import-template/required-columns.spec.ts).
- The e2e form fixture (`fillPublishableFields`) and the demo seed, which self-validate against the blockers.

### 7. Export and bulk edit need nothing

`EXPORT_SAMPLE_COLUMNS` derives from `SAMPLE_COLUMNS`. A cell frozen by publication is greyed, and a change to it is refused (`frozen_field`). Both read the lock maps in `published-field-lock.ts`, the form guide's step 5. Only `igsn` and `parents.igsn` are special-cased in [export-workbook.ts](../packages/api/src/sample/bulk-edit/export-workbook.ts).

### 8. The `/service` Core slot

A new field is also a `/service` field: see "Avoid drift" below.

## Add a one-to-many relation (a child sheet)

A field the sample has several of is a `z.array(...)` in the schema. It lives on its own tab, one value per row, never as repeated columns on "Samples".

**How the join works.** `COLUMN_KINDS` gives every leaf under an array an `arrayPrefix` (`relations` for `relations.identifier`). A child row names its sample in `Sample #`. `withChildRow` (`build-sample-inputs.ts`) folds the row's fields sharing a prefix into one element appended to that array. It records `rowsByPath["relations.0"] = { sheet, row }`, so a later issue points at that row. A row naming no sample on "Samples" is an `unknown_sample_key` orphan.

### 1. Name the sheet

```ts
// columns.ts
export const SHEETS = {
  // ...
  thinSections: "Thin sections",
} as const;
```

Excel caps a sheet name at 31 characters.

### 2. Declare its columns

A single-value array (an organisation, an element) is one helper call:

```ts
valueSheet(
  SHEETS.thinSections,
  "Sample classification",
  "Thin section",
  "thinSections",
  "thin_section",
),
```

An element with several fields starts with `KEY_COLUMNS` and prefixes each path:

```ts
const THIN_SECTION = "thinSections";

const THIN_SECTION_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Sample classification", [
    field("Thin section kind", `${THIN_SECTION}.kind`, "thin_section_kind"),
    field("Thin section thickness", `${THIN_SECTION}.thicknessMicrometers`),
  ]),
]);
```

### 3. Register it

Append `{ name: SHEETS.thinSections, columns: THIN_SECTION_COLUMNS }` to `CHILD_SHEETS`. Array order is tab order. `addChildSheet` adds the `Sample #` dropdown over the "Samples" keys and the "Sample name (filled automatically)" lookup. The Read me line listing the tabs updates itself. A tab left with only its key columns after a customization is dropped.

### 4. Know the semantics you get

- A scalar beside the array is allowed (the storage-condition readings). It is set once per sample. A second row giving a different value is a `duplicate_value`.
- Export writes one row per element (`childRows`). "Attachments" is the one tab the export leaves out (`EXPORT_CHILD_SHEETS`).
- Bulk edit: an absent tab keeps the stored values (`withStoredCells`). A present tab must carry every column. `mergeStoredSample` replaces only template paths. A whole-list replacement with its own persistence, like process steps (`packages/api/src/sample/service/replace-sample-process-steps.ts`), is a service call of its own. Say in the PR which you want.

### 5. Tests

Add the path to the `it.each` "several values ... one per row on its own tab" in `columns.spec.ts`. Add a join case in [build-sample-inputs.spec.ts](../packages/api/src/sample/import-template/build-sample-inputs.spec.ts).

**Gotcha**: the lookup formula is `VLOOKUP($A, Samples!$A:$B, 2)`, so `Name` must stay column B of "Samples".

## Add a controlled vocabulary

### A value in an existing vocabulary

Nothing here. The blocks read the domain constants. The form guide's "Add/remove a selector value" is the whole change. [vocabulary-sheet.spec.ts](../packages/api/src/sample/import-template/vocabulary-sheet.spec.ts) fails on a label equal to its code, or duplicated under one parent. [workbook.spec.ts](../packages/api/src/sample/import-template/workbook.spec.ts) fails on a validation formula over Excel's 255-character limit.

### A new flat vocabulary

```ts
// vocabulary-sheet.ts
flat("grain_size", "Grain size", GRAIN_SIZES, labels.grainSizeLabel),
```

- `id` is what the column's `block` names.
- The label function comes from `createSampleLabels` in `domain`. Add it there, never a map in `api`: a vocabulary's text lives in `domain/messages` ([i18n.md](../.claude/rules/i18n.md)).
- Labels must be unique within the block: the parser turns a label back into its code ([resolve-label.ts](../packages/api/src/sample/import-template/resolve-label.ts)).

### A new hierarchy

Columns and blocks pair by `block` and level:

```ts
// columns.ts
...tree("grainShape", "grain_shape", "Grain shape", GRAIN_SHAPE_PATHS),
// vocabulary-sheet.ts
...hierarchy("grain_shape", "Grain shape", GRAIN_SHAPE_PATHS, labels.grainShapeLabel),
```

`tree` makes one column per level (`Grain shape (level 1)`...). `hierarchy` makes one block per level (`grain_shape_1`...), with a parent breadcrumb per row. The level-2 dropdown cascades off level 1 (`OFFSET`/`MATCH` in [workbook.ts](../packages/api/src/sample/import-template/workbook.ts)). The parser resolves each level under its parent. If the hierarchy can block publication, register its completeness in `HIERARCHIES` ([required-columns.ts](../packages/api/src/sample/import-template/required-columns.ts)) or the build throws `No completeness known`.

### Labels with no domain resolver

Yes/no, position type, region kind and date precision are form chrome, not domain enums. Their labels are local maps in [vocabulary-sheet.ts](../packages/api/src/sample/import-template/vocabulary-sheet.ts) (`YES_NO_LABEL`...), reused by [conditional-fields.ts](../packages/api/src/sample/import-template/conditional-fields.ts). Add one only for chrome. A domain enum's labels belong in `domain`.

### A list known only at request time

Manual groups come from the requester's attachable groups. `manualGroupBlock` builds the block per request, and `build()` in `workbook.ts` appends it to the static blocks. Follow it for any list no constant holds.

### The `/service` face

`/service` publishes every vocabulary as an OpenAPI enum and maps it to a Core slot (`packages/domain/src/sample/core/core-vocabularies.ts`). A new vocabulary needs its slot there, see below.

## Change the column grouping

- `group` on a column is its row-1 header. `mergeGroupRow` merges contiguous runs only, so keep a group's columns adjacent or Excel shows the group twice.
- Groups mirror the form's tabs on purpose (Read me line 1), "Geological context" being the one section. `workbook.spec.ts` checks the runs follow `COLUMN_GROUPS` order.
- Move a column: move its line into another `grouped()` call. Nothing else reads `group`.
- Rename or add a group: `COLUMN_GROUPS`, plus `TEMPLATE_SECTIONS` when a download checkbox drops it.
- Order within a sheet is array order. Uploads match headers by name, so reordering costs existing files nothing.

## Remove a column

### 1. Delete its line

The coverage spec now fails unless the schema field is gone too. A field kept in the schema but deliberately off the template goes in `EXCLUDED` in `columns.spec.ts`. The `*UserId` and deferred fields sit there today.

### 2. Remove what referenced it

- Its `CONDITIONAL_FIELDS` entries (the spec "every governed path and every driving column resolves" fails otherwise).
- Its block, if nothing else uses it.
- Its `IMPORT_DEFAULTS` entry.
- Its `CLEAN_SAMPLE` cell and any e2e header (`e2e/support/admin/template-workbook.ts`, `e2e/admin/sample-import.spec.ts`).

### 3. Old files are safe

`sheetLayout` walks the template's columns, so an unknown header in an uploaded file is ignored. A removed column never refuses a stale template. In bulk edit a column absent from the upload keeps the stored value.

### 4. Renaming is a removal plus an addition

For every file already downloaded, a renamed header reads as deleted (ADR 0051). On a required column that is `missing_column` for every outstanding template, so avoid it, or announce it to the researchers.

## Avoid drift between Excel, the form and /service

`createSampleSchema` is the one truth. Each face derives from it and has its guard:

| Face       | Derives                                                                                                                                 | Guard                                                                                                                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Excel      | columns from the schema leaves, type from the JSON schema, "\*" from the blockers, labels from `domain`                                 | the coverage test in `columns.spec.ts`, [column-kind.spec.ts](../packages/api/src/sample/import-template/column-kind.spec.ts), `conditional-fields.spec.ts`                                                                                                                                                                             |
| Form       | `composeCreateSample` validates against the schema, `FIELD_TAB` is exhaustive over `SampleDraft`, "\*" from `samplePublishRequirements` | the compiler, over the draft type                                                                                                                                                                                                                                                                                                       |
| `/service` | `toCoreSample` / `fromCoreSample`, `CORE_PATH_BY_FIELD`                                                                                 | the field coverage test in [core-path.spec.ts](../packages/domain/src/sample/core/core-path.spec.ts), the round trip in [core-round-trip.spec.ts](../packages/domain/src/sample/core/core-round-trip.spec.ts) for the fields a fixture fills, [core-vocabularies.spec.ts](../packages/domain/src/sample/core/core-vocabularies.spec.ts) |

Three rules keep them aligned:

- **One condition, one helper.** The form's `form.Subscribe` and compose exclusion call a `domain` predicate. The template's `CONDITIONAL_FIELDS` and the schema's `checkSample` call the same one. The schema is the guard, the other two are UX.
- **Never hand-list a requirement.** The template reads the blockers, the form reads the requirements, both from `samplePublishRequirements`.
- **Labels come from `domain` once.** Vocabulary labels are the same catalog everywhere. Column headers alone are English strings owned by `columns.ts`, shown raw in the admin report, and need no translation.

### New-field checklist

| Step                  | Where                                                                                                        | The red test                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Schema                | `createSampleSchema` in `packages/domain/src/sample/sample.ts`                                               | none, start here                                                                                              |
| Form                  | draft, compose, field, tab                                                                                   | `FIELD_TAB` fails to compile                                                                                  |
| Template column       | `columns.ts`, a condition, a block                                                                           | the coverage test in `columns.spec.ts`                                                                        |
| Core slot             | `CORE_PATH_BY_FIELD`, `toCore*` / `fromCore*`, a row in [igsn-core-mapping.md](../docs/igsn-core-mapping.md) | the coverage test in `core-path.spec.ts`, or the field in its `NOT_IN_CORE` list, the reason stated in the PR |
| Fixtures, if required | `CLEAN_SAMPLE`, `required-columns.spec.ts`, the e2e fixture, the seed                                        | those specs                                                                                                   |

## Other maintenance points

- **Templates live long.** `TEMPLATE_VERSION` is written to Read me B1 and never checked. A new required column breaks every file downloaded before it. A new optional one is simply empty.
- **Customization** is one JSON cell, Read me `C1`: `{ provenanceStatus, materialPath, manualGroupLabel }`. The section flags stay out of it since headers suffice. A new kind of pre-fill touches `storedCustomizationSchema`, `prefillOf` and `possibleLabelsOf` ([customization.ts](../packages/api/src/sample/import-template/customization.ts)). It also touches `withoutPrefilledRows` ([validate-import.ts](../packages/api/src/sample/import-template/validate-import.ts)), since a row equal to its pre-fills and defaults is not a sample.
- **Defaults.** `IMPORT_DEFAULTS` pre-fills the cell and keeps the column out of the required set. The server applies the default when the column is absent.
- **Issue codes.** A new one is `importIssueCodeSchema` (`packages/domain/src/sample/import/import-report.ts`), `IMPORT_ISSUE_LABELS` (`packages/admin/src/samples/import-issue-label.ts`, exhaustive) and both admin catalogs. A blocker code is labelled by `publishBlockerLabel`, a zod code falls back to its message.
- **Excel limits.** A validation formula is capped at 255 characters (spec) and a sheet name at 31. A file holds at most `MAX_IMPORT_ROWS` samples. Dropdown errors are warnings by design, and "Vocabularies" is the only protected sheet.
- **Build and parse are serialized** through `queueBuild`, since both are CPU-bound. Keep per-cell work cheap.
- **Attachments.** File names match staged uploads exactly (ADR [0054](adr/0054-tus-staged-uploads-for-import-documents.md)). `admin` reads that tab client-side through the shared header constants in `packages/domain/src/sample/import/attachment-sheet.ts`, nothing else.
- **Sub-samples.** "Parent IGSN" and "Process steps" exist only when the download asks for sub-samples. Location and collection date are inherited, and a filled one is refused (ADR [0053](adr/0053-ancestor-location-inheritance.md)).
- **The legacy dump import** (`packages/api/scripts/import-legacy.ts`, ADR [0027](adr/0027-legacy-dump-import.md)) is a different mechanism with its own mapping, not this template.
- **Rate limits.** Upload and duplicate check are 5 per minute per user.
- **Read next**: ADR 0051, 0052, 0053, 0054, and the import bullets of `.claude/rules/architecture.md`.

## Verify

```
pnpm lint:check
pnpm fmt:check
pnpm test --project @projet-igsn/api packages/api/src/sample/import-template packages/api/src/sample/bulk-edit
pnpm test --project @projet-igsn/domain packages/domain/src/sample/core
```
