# Updating the Excel import template

This guide is about the Excel bulk import of samples. A researcher downloads an xlsx, fills one sample per row and uploads it. The bulk-edit export and its re-import use the same file. One list, the column registry in [columns.ts](../packages/api/src/sample/import-template/columns.ts), drives all four. Edit that list and let the rest derive. A new field starts in the form ([updating-the-sample-form.md](updating-the-sample-form.md)) and gets a column here afterwards.

## A few terms first

- **Column**: one entry of the registry, `{ header, group, path?, block?, level? }`.
- **Path**: where the value lands in the sample, as dotted keys (`description.mass.value`). It is the shape `createSampleSchema` validates.
- **Block**: a named list of allowed values on the "Vocabularies" sheet, feeding a dropdown (`nature`, `size_unit`, `material_2`).
- **Child sheet**: a tab for a field a sample has several of (relations, storage conditions). One value per row, each row naming its sample by `Sample #`.
- **Blocker**: a reason a sample cannot be published. A column answering one carries a trailing "\*".

## Mental model

Everything lives in `packages/api/src/sample/import-template/` (download, upload) and `packages/api/src/sample/bulk-edit/` (export, re-import). `packages/domain/src/sample/import/` holds only what `admin` shares: header row, required marker, sheet names, issue codes, section keys. `admin` uploads the file and shows the issues (ADR [0051](adr/0051-excel-import-label-contract.md)).

The registry reads like the sheet it builds:

```ts
// packages/api/src/sample/import-template/columns.ts
export const SAMPLE_COLUMNS: readonly Column[] = marked([
  ...grouped("Sample", [{ header: SAMPLE_KEY_HEADER }]),
  ...grouped("Identity", [
    field(SAMPLE_NAME_HEADER, "name"),
    field("Local ID", "localId"),
    ...tree("type", "sample_type", "Sample type", SAMPLE_TYPES),
    field("Nature", "nature", "nature"),
    // ...
  ]),
  ...grouped("Physical description", [
    field("Mass", "description.mass.value"),
    field("Mass unit", "description.mass.unit", "mass_unit"),
    field("Oriented sample", "description.oriented", "yes_no"),
    // ...
  ]),
]);
```

`field(header, path, block?)` is one column. `tree(...)` is one column per level of a hierarchy. `grouped(group, columns)` sets the row-1 header. `marked(...)` appends "\*" to the blockers' columns. Everything else is computed:

| Concern                               | Computed by                                                                                                                                                                                                                                               | From                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cell type, array membership           | `COLUMN_KINDS` in [column-kind.ts](../packages/api/src/sample/import-template/column-kind.ts)                                                                                                                                                             | the JSON schema of `createSampleSchema`                                                                |
| Trailing "\*"                         | `marked()` in `columns.ts`                                                                                                                                                                                                                                | `PUBLISH_BLOCKER_PATH`, level 1 of a hierarchy only                                                    |
| Column whose absence refuses the file | [required-columns.ts](../packages/api/src/sample/import-template/required-columns.ts)                                                                                                                                                                     | the schema's required fields and the blockers, minus conditional fields and `IMPORT_DEFAULTS`          |
| Dropdowns, "Vocabularies" sheet       | [vocabulary-sheet.ts](../packages/api/src/sample/import-template/vocabulary-sheet.ts), by `block`                                                                                                                                                         | the domain vocabularies, labelled by [labels.ts](../packages/api/src/sample/import-template/labels.ts) |
| Grey cells, prompts, dropped columns  | [conditional-fields.ts](../packages/api/src/sample/import-template/conditional-fields.ts)                                                                                                                                                                 | the domain predicates (`texturesFor`, `allowsLocation`...)                                             |
| Reading an upload                     | [template-layout.ts](../packages/api/src/sample/import-template/template-layout.ts), [read-rows.ts](../packages/api/src/sample/import-template/read-rows.ts), [build-sample-inputs.ts](../packages/api/src/sample/import-template/build-sample-inputs.ts) | the same registry and blocks                                                                           |
| Validating an upload                  | [validate-samples.ts](../packages/api/src/sample/import-template/validate-samples.ts)                                                                                                                                                                     | `publishedSampleSchema`, issues placed back on sheet, row and column                                   |
| Export, bulk edit                     | [export-columns.ts](../packages/api/src/sample/bulk-edit/export-columns.ts), [sample-row.ts](../packages/api/src/sample/bulk-edit/sample-row.ts)                                                                                                          | the same columns, frozen cells from `published-field-lock.ts`                                          |

**The upload**, `POST /admin/samples/import`:

1. `templateLayout` matches the row-2 headers by name.
2. `readRows` reads the rows and joins each child row to its sample by `Sample #`.
3. `buildSampleInputs` turns the cells into one `createSampleSchema` input per sample.
4. `validateSamples` checks each input against `publishedSampleSchema`.
5. Any issue answers 422 for the whole file. A clean file queues every sample as `publishing` (ADR [0052](adr/0052-async-import-publication-via-publishing-status.md)).

```json
{
  "sheet": "Samples",
  "row": 4,
  "column": "Nature",
  "value": "Hand sampel",
  "code": "invalid_value"
}
```

The admin report translates `code` through [import-issue-label.ts](../packages/admin/src/samples/import-issue-label.ts).

**The contract** (ADR 0051): headers match by name. Every downloaded template stays uploadable, whatever its age. A label or its raw code is accepted. The server alone validates.

## Add a column

For a scalar field: a text, a number, a yes/no, a code.

### 1. Put the field in `domain` and the form first

Follow the form guide. Once the field is in `createSampleSchema`, the coverage test in [columns.spec.ts](../packages/api/src/sample/import-template/columns.spec.ts) is red. That is your reminder.

### 2. Add one line to the registry

```ts
...grouped("Physical description", [
  // ...
  field("Grain size", "description.grainSize", "grain_size"),
]),
```

The header is English, human and unique on its sheet. The spec checks it. Its place in the array is its place in Excel. `block` is only for a dropdown. A yes/no field uses `"yes_no"`.

### 3. Type, marker and required check derive

A number column parses `Number(cell)`. A text column takes the text. A `yes_no` block gives a boolean. A path in `PUBLISH_BLOCKER_PATH` gets its "\*" and joins the required columns. A date cell is written as `YYYY-MM-DD`. It keeps the minute when a sibling `precision` column says "Hour and minute" (`isHourPrecision` in [build-sample-inputs.ts](../packages/api/src/sample/import-template/build-sample-inputs.ts)).

### 4. Mirror the form's display condition

Hidden behind a sibling in the form? Add the same rule here, calling the same domain helper:

```ts
// packages/api/src/sample/import-template/conditional-fields.ts
{
  paths: ["texture"],
  condition: material(4, "is", (path) => texturesFor(path).length > 0),
},
{
  paths: ["localIdDescription"],
  prompt: `Only when "${headerOf("localId")}" is filled.`,
},
```

A `condition` greys the cell and adds the sentence to the prompt. It keeps the column out of the required set. A pre-fill that rules it out drops the column. A `prompt` alone adds the sentence. `values` are labels, never codes. The schema stays the real guard: a value it drops is reported as `not_applicable`.

### 5. Fixtures, when the field is required

- `CLEAN_SAMPLE` and `CLEAN_INPUT` in [import-fixture.ts](../packages/api/src/sample/import-template/import-fixture.ts), the one publishable file every api spec fills. `packages/api/scripts/write-clean-import.ts` writes it for e2e too.
- The header list in [required-columns.spec.ts](../packages/api/src/sample/import-template/required-columns.spec.ts).
- The e2e `fillPublishableFields` and the demo seed.

### 6. Export, bulk edit and `/service`

Export derives from `SAMPLE_COLUMNS`. A cell frozen by publication is greyed and refused (`frozen_field`), from the lock maps in `published-field-lock.ts`. Only `igsn` and `parents.igsn` are special-cased in [export-workbook.ts](../packages/api/src/sample/bulk-edit/export-workbook.ts). The `/service` slot is in "Avoid drift" below.

## Add a one-to-many relation (a child sheet)

An array field lives on its own tab. `COLUMN_KINDS` gives its leaves an `arrayPrefix`. `withChildRow` folds one row's fields into one element of the array and remembers the row, so an issue points back at it.

A single-value array is one call:

```ts
// columns.ts, in CHILD_SHEETS
valueSheet(
  SHEETS.funderOrganizations,
  "Scientific context",
  "Funder organization",
  "scientificContext.funderOrganizations",
  "organization",
),
```

An element with several fields starts with `KEY_COLUMNS` and prefixes each path:

```ts
const PROCESS_STEP = "processSteps";

const PROCESS_STEP_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Identity", [
    field("Kind", `${PROCESS_STEP}.kind`, "process_step_kind"),
    field("Date start", `${PROCESS_STEP}.date.start`),
    field("Description", `${PROCESS_STEP}.description`),
  ]),
]);
```

Steps:

1. Name the tab in `SHEETS` (31 characters at most, an Excel limit).
2. Declare the columns as above.
3. Append `{ name, columns }` to `CHILD_SHEETS`. Array order is tab order.
4. Add the path to the "one per row on its own tab" case in `columns.spec.ts`, and a join case in [build-sample-inputs.spec.ts](../packages/api/src/sample/import-template/build-sample-inputs.spec.ts).

The rest is free. The tab gets its `Sample #` dropdown and name lookup. The Read me line lists it. Export writes its rows. A customization that empties it drops it. A scalar beside the array is set once per sample. A second row with another value is a `duplicate_value`.

Bulk edit keeps the stored values of an absent tab, and `mergeStoredSample` replaces only template paths. A whole-list replacement, like process steps (`replace-sample-process-steps.ts`), is a service call of its own. Say in the PR which you want.

**Gotcha**: the lookup is `VLOOKUP($A, Samples!$A:$B, 2)`. `Name` must stay column B of "Samples".

## Add a controlled vocabulary

The blocks read the domain constants, so a new value in an existing vocabulary arrives on its own.

A new flat vocabulary is one block, named by the column's `block`:

```ts
// packages/api/src/sample/import-template/vocabulary-sheet.ts
flat("nature", "Nature", NATURES, labels.natureLabel),
```

`labels` is `createSampleLabels` bound to the English catalog. Add the label function in `domain` ([i18n.md](../.claude/rules/i18n.md)). Labels must be unique within a block, since the parser turns them back into codes ([resolve-label.ts](../packages/api/src/sample/import-template/resolve-label.ts)).

A hierarchy pairs a `tree` of columns with a `hierarchy` of blocks:

```ts
// columns.ts
...tree("material", "material", "Material", TEMPLATE_MATERIAL_PATHS),
// vocabulary-sheet.ts
...hierarchy("material", "Material", TEMPLATE_MATERIAL_PATHS, labels.materialPathLabel),
```

That gives `Material (level 1)`, `Material (level 2)`... and blocks `material_1`, `material_2`... Level 2 cascades off level 1 in Excel. The parser resolves each level under its parent. A hierarchy that can block publication registers its completeness in `HIERARCHIES` ([required-columns.ts](../packages/api/src/sample/import-template/required-columns.ts)), or the build throws.

Yes/no, position type, region kind and date precision are form chrome. Their labels are local maps in `vocabulary-sheet.ts` (`YES_NO_LABEL`...). A list known at request time, like manual groups, follows `manualGroupBlock`.

## Change the column grouping

```ts
export const COLUMN_GROUPS = [
  "Sample",
  "Identity",
  "Sample classification",
  "Location",
  // ...
] as const;
```

`group` is the row-1 header, merged over contiguous runs. Keep a group's columns adjacent or Excel shows it twice. Groups mirror the form tabs on purpose. Move a column by moving its line into another `grouped()` call. Rename or add a group in `COLUMN_GROUPS`, and in `TEMPLATE_SECTIONS` when a download checkbox drops it. Order is array order. Uploads match by name, so reordering costs nothing.

## Make a column optional in a customized template

The download dialog lets a researcher untick what their samples never need. The unit is the group:

```ts
// packages/domain/src/sample/import/import-validator.ts
export const TEMPLATE_SECTION_KEYS = [
  "physicalDescription",
  "age" /* ... */,
] as const;

// columns.ts
export const TEMPLATE_SECTIONS = {
  physicalDescription: "Physical description",
  age: "Age",
  // ...
} as const satisfies Record<TemplateSectionKey, ColumnGroup>;

// packages/admin/src/samples/customize-template-dialog.tsx
const SECTION_LABELS: Record<TemplateSectionKey, () => string> = {
  physicalDescription: m.tab_physical_description,
  // ...
};
```

A flag sent `false` drops the group's columns and any tab left with only key columns. Upload reads the headers that are there.

1. A column in `REQUIRED_SAMPLE_COLUMNS` refuses the file by its absence. Take it out of that set first, with a condition or an `IMPORT_DEFAULTS` default.
2. Move the column into a group that has a checkbox.
3. Or add a checkbox to its group: the key, the `TEMPLATE_SECTIONS` entry, the dialog label and its `ALL_SECTIONS` default. The records are exhaustive, so the build names what you miss.
4. One column alone has one precedent, `subSamples`: a flag on `TemplateCustomization` and a `path` filter in `build()` ([workbook.ts](../packages/api/src/sample/import-template/workbook.ts)). Prefer a group.
5. A column the pre-fill rules out is already dropped (`droppedColumnsOf` in [customization.ts](../packages/api/src/sample/import-template/customization.ts)).

Test: one more case in the `it.each` over `TemplateSectionKey` in [workbook.spec.ts](../packages/api/src/sample/import-template/workbook.spec.ts).

## Remove a column

Delete its line. The coverage test now fails unless the schema field is gone too. A field kept in the schema but off the template on purpose goes in the spec's exclusion list:

```ts
// columns.spec.ts
const EXCLUDED = [
  ...DEFERRED_FIELDS,
  ...IDENTIFIER_ONLY_FIELDS,
  ATTACHMENT_ID_FIELD,
];
```

Then remove its `CONDITIONAL_FIELDS` entries, its unused block, its `IMPORT_DEFAULTS` entry, its `CLEAN_SAMPLE` cell and any e2e header (`e2e/support/admin/template-workbook.ts`).

Old files stay valid, since an unknown header is ignored. Bulk edit keeps the stored value of an absent column.

**Renaming a header is a removal plus an addition** for every file already downloaded. On a required column that is `missing_column` everywhere. Avoid it, or announce it.

## Avoid drift between Excel, the form and /service

`createSampleSchema` is the one truth. Each face has a test that goes red when a field misses it:

| Face       | Derives                                                                                  | Guard                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Excel      | columns from the schema leaves, "\*" from the blockers, labels from `domain`             | the coverage test in `columns.spec.ts`                                                                                                      |
| Form       | `composeCreateSample` validates against the schema, `FIELD_TAB` covers every draft field | the compiler                                                                                                                                |
| `/service` | `toCoreSample` / `fromCoreSample`, `CORE_PATH_BY_FIELD`                                  | the coverage test in [core-path.spec.ts](../packages/domain/src/sample/core/core-path.spec.ts), the round trip in `core-round-trip.spec.ts` |

The two coverage tests have the same shape, a schema walk minus an explicit exclusion list:

```ts
// columns.spec.ts
expect(unique(covered)).toEqual(
  unique([...COLUMN_KINDS.keys()].filter(isTemplated)),
);

// core-path.spec.ts
const NOT_IN_CORE = ["localIdDescription", "attachments"];
const unmapped = Object.keys(createSampleSchema.shape).filter((field) => {
  const probe = `${field}.leaf`;
  return !NOT_IN_CORE.includes(field) && toCorePath(probe) === probe;
});
expect(unmapped).toEqual([]);
```

Three rules keep the faces aligned:

- **One condition, one helper.** The form, `CONDITIONAL_FIELDS` and the schema's `checkSample` call the same `domain` predicate.
- **Requirements come from one place.** Template and form both read `samplePublishRequirements`.
- **Labels come from `domain` once.** Only the column headers are English strings owned by `columns.ts`.

New-field checklist:

| Step                  | Where                                                                          | Red until done                                                  |
| --------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Schema                | `createSampleSchema` in `packages/domain/src/sample/sample.ts`                 | start here                                                      |
| Form                  | draft, compose, field, tab                                                     | `FIELD_TAB` fails to compile                                    |
| Template column       | `columns.ts`, a condition, a block                                             | `columns.spec.ts`                                               |
| Core slot             | `CORE_PATH_BY_FIELD`, `toCore*` / `fromCore*`, a row in `igsn-core-mapping.md` | `core-path.spec.ts`, or `NOT_IN_CORE` with the reason in the PR |
| Fixtures, if required | `CLEAN_SAMPLE`, `required-columns.spec.ts`, e2e, seed                          | those specs                                                     |

## Other maintenance points

- **Templates live long.** `TEMPLATE_VERSION` goes to Read me B1 as information. A new required column breaks every file downloaded before it.
- **Customization** is one JSON cell, Read me `C1`: `{ provenanceStatus, materialPath, manualGroupLabel }`. A new pre-fill kind touches `prefillOf`, `possibleLabelsOf` and `withoutPrefilledRows`. A row equal to its pre-fills is not a sample.
- **Defaults.** `IMPORT_DEFAULTS` pre-fills the cell and is applied when the column is absent.
- **Issue codes.** A new one is `importIssueCodeSchema` in `domain`, `IMPORT_ISSUE_LABELS` in `admin` (exhaustive) and both catalogs.
- **Excel limits.** A validation formula is capped at 255 characters (a spec checks) and a sheet name at 31. A file holds `MAX_IMPORT_ROWS` samples at most.
- **Build and parse are serialized** through `queueBuild`. Keep per-cell work cheap.
- **Sub-samples.** "Parent IGSN" and "Process steps" exist only when asked for. Location and collection date are inherited (ADR [0053](adr/0053-ancestor-location-inheritance.md)).
- **Attachments** match staged uploads by exact file name (ADR [0054](adr/0054-tus-staged-uploads-for-import-documents.md)).
- **The legacy dump import** (`packages/api/scripts/import-legacy.ts`, ADR [0027](adr/0027-legacy-dump-import.md)) is another mechanism.

## Verify

```
pnpm lint:check
pnpm fmt:check
pnpm test --project @projet-igsn/api packages/api/src/sample/import-template packages/api/src/sample/bulk-edit
pnpm test --project @projet-igsn/domain packages/domain/src/sample/core
```
