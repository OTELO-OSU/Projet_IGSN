# Updating the Excel import template

This guide is about the Excel bulk import of samples. A researcher downloads an xlsx, fills it and uploads it, and the bulk-edit export reuses the same file. Every recipe below edits one list, the column registry in [columns.ts](../packages/api/src/sample/import-template/columns.ts), and runs the same tests:

```
pnpm test --project @projet-igsn/api packages/api/src/sample/import-template packages/api/src/sample/bulk-edit
```

A new field starts in the form ([updating-the-sample-form.md](updating-the-sample-form.md)). It gets a column here afterwards.

## How do I add a column?

Say the sample gained a `description.grainSize` field, an enum, already in `createSampleSchema` and in the form.

**1. Run the tests.** The coverage test in [columns.spec.ts](../packages/api/src/sample/import-template/columns.spec.ts) is red: "should carry a column for every createSampleSchema leaf". It stays red until the column exists.

**2. Add one line** in the group where the form shows the field:

```ts
// packages/api/src/sample/import-template/columns.ts
...grouped("Physical description", [
  field("Open description", "description.openDescription"),
  field("Grain size", "description.grainSize", "grain_size"), // added
  field("Length", "description.length.value"),
  // ...
]),
```

`field(header, path, block?)`: the header is the English text on row 2, unique on its sheet. The path is the field's place in the sample. The block names the dropdown, see the next recipe. A yes/no field uses the existing `"yes_no"` block. The line's position is the column's position in Excel.

**3. Check the type, the "\*" and the required check.** All three derive. The type comes from the JSON schema of `createSampleSchema` at that path (`COLUMN_KINDS`). The "\*" appears when the path is in `PUBLISH_BLOCKER_PATH`. The column joins the set whose absence refuses a file when the schema or a blocker requires it ([required-columns.ts](../packages/api/src/sample/import-template/required-columns.ts)).

**4. Mirror the form's display condition.** The form hides a field behind a sibling? Add the same rule here, with the same domain helper. Texture, shown for igneous rocks only, reads:

```ts
// packages/api/src/sample/import-template/conditional-fields.ts
{
  paths: ["texture"],
  condition: material(4, "is", (path) => texturesFor(path).length > 0),
},
```

The cell greys out when "Material (level 4)" holds another value, and the prompt says so. The column also leaves the required set. A rule beyond an Excel formula takes a `prompt` instead:

```ts
{
  paths: ["localIdDescription"],
  prompt: `Only when "${headerOf("localId")}" is filled.`,
},
```

**5. Update the fixtures if the field is required.** `CLEAN_SAMPLE` in [import-fixture.ts](../packages/api/src/sample/import-template/import-fixture.ts) is the one publishable file every spec fills. `packages/api/scripts/write-clean-import.ts` writes it for e2e. Add the header to [required-columns.spec.ts](../packages/api/src/sample/import-template/required-columns.spec.ts), to the e2e `fillPublishableFields` and to the demo seed.

**6. Run the tests again.** Export and bulk edit follow on their own. `EXPORT_SAMPLE_COLUMNS` derives from `SAMPLE_COLUMNS`. A cell frozen by publication greys out from the lock maps in `published-field-lock.ts`. The `/service` side is the "keep in sync" recipe below.

## How do I add a field with several values?

Say a sample now lists its thin sections, `thinSections: z.array(thinSectionSchema)`. A repeated value gets its own tab, one value per row, each row naming its sample by `Sample #`.

**1. Name the tab:**

```ts
// columns.ts
export const SHEETS = {
  // ...
  thinSections: "Thin sections",
} as const;
```

**2. Declare its columns.** A tab holding one value per row is one call:

```ts
valueSheet(
  SHEETS.thinSections,
  "Sample classification",
  "Thin section",
  "thinSections",
  "thin_section",
),
```

An element with several fields starts with the key columns and prefixes each path:

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

**3. Register it** in `CHILD_SHEETS`. Array order is tab order:

```ts
export const CHILD_SHEETS = [
  // ...
  { name: SHEETS.thinSections, columns: THIN_SECTION_COLUMNS },
];
```

**4. Add two test cases.** The path goes in the "one per row on its own tab" case of `columns.spec.ts`. A join case goes in [build-sample-inputs.spec.ts](../packages/api/src/sample/import-template/build-sample-inputs.spec.ts).

The tab gets its `Sample #` dropdown and name lookup, the Read me lists it, export writes its rows. On upload, `withChildRow` ([build-sample-inputs.ts](../packages/api/src/sample/import-template/build-sample-inputs.ts)) turns each row into one element of the array. It remembers the row, so an issue points back at it. A scalar beside the array, like the storage-condition readings, is set once per sample. A second row with another value is a `duplicate_value`.

Bulk edit keeps the stored list when the tab is absent and replaces the template paths when it is present. A list with its own persistence, like process steps (`replace-sample-process-steps.ts`), needs its own service call. Say in the PR which you want.

**Gotcha**: the name lookup is `VLOOKUP($A, Samples!$A:$B, 2)`. `Name` stays column B of "Samples".

## How do I add a dropdown?

A new value in an existing vocabulary arrives on its own: the blocks read the domain constants.

A new flat vocabulary is one block in [vocabulary-sheet.ts](../packages/api/src/sample/import-template/vocabulary-sheet.ts), named by the column's `block`:

```ts
flat("grain_size", "Grain size", GRAIN_SIZES, labels.grainSizeLabel),
```

`labels` is `createSampleLabels` bound to the English catalog. Add the label function in `domain` ([i18n.md](../.claude/rules/i18n.md)). Keep labels unique within a block, since the parser turns a label back into its code ([resolve-label.ts](../packages/api/src/sample/import-template/resolve-label.ts)). A raw code typed in the cell is accepted too.

A hierarchy pairs a `tree` of columns with a `hierarchy` of blocks:

```ts
// columns.ts
...tree("material", "material", "Material", TEMPLATE_MATERIAL_PATHS),
// vocabulary-sheet.ts
...hierarchy("material", "Material", TEMPLATE_MATERIAL_PATHS, labels.materialPathLabel),
```

That gives the columns `Material (level 1)`, `Material (level 2)`... and the blocks `material_1`, `material_2`... Level 2 cascades off level 1 in Excel, and the parser resolves each level under its parent. A hierarchy that can block publication registers its completeness in `HIERARCHIES` (`required-columns.ts`).

A list known at request time, like the researcher's manual groups, follows `manualGroupBlock`.

## How do I move a column or rename a group?

Row 1 holds the groups, mirroring the form tabs:

```ts
export const COLUMN_GROUPS = [
  "Sample",
  "Identity",
  "Sample classification",
  "Location",
  // ...
] as const;
```

- **Move a column**: move its line into another `grouped()` call. Keep a group's columns adjacent, since row 1 merges contiguous runs.
- **Reorder columns**: reorder the lines. Uploads match headers by name, so old files keep working.
- **Rename or add a group**: edit `COLUMN_GROUPS`, and `TEMPLATE_SECTIONS` when a download checkbox drops that group.

## How do I make a column optional in the download dialog?

The dialog lets a researcher untick what their samples do without. One checkbox is one group:

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

1. **Take the column out of the required set first.** A column in `REQUIRED_SAMPLE_COLUMNS` refuses the file by its absence. A condition or an `IMPORT_DEFAULTS` default takes it out, the way existence and availability status left it.
2. **Move the column into a group with a checkbox.** Or add a checkbox to its group: the key, the `TEMPLATE_SECTIONS` entry, the dialog label and its `ALL_SECTIONS` default. The records are exhaustive, so the build names what you miss.
3. **One column alone** follows `subSamples`: a flag on `TemplateCustomization` and a `path` filter in `build()` ([workbook.ts](../packages/api/src/sample/import-template/workbook.ts)). Prefer a group.
4. **Add the case** to the `it.each` over `TemplateSectionKey` in [workbook.spec.ts](../packages/api/src/sample/import-template/workbook.spec.ts).

A column the pre-fill rules out, like texture on a sediment template, is already dropped (`droppedColumnsOf` in [customization.ts](../packages/api/src/sample/import-template/customization.ts)).

## How do I remove a column?

Delete its line. The coverage test fails until the schema field is gone too. A field kept in the schema but off the template on purpose goes in the exclusion list:

```ts
// columns.spec.ts
const EXCLUDED = [
  ...DEFERRED_FIELDS,
  ...IDENTIFIER_ONLY_FIELDS,
  ATTACHMENT_ID_FIELD,
];
```

Then delete its `CONDITIONAL_FIELDS` entries, its unused block, its `IMPORT_DEFAULTS` entry, its `CLEAN_SAMPLE` cell and any e2e header (`e2e/support/admin/template-workbook.ts`). Old files stay valid, since an unknown header is ignored, and bulk edit keeps the stored value of an absent column.

**Renaming a header is a removal plus an addition** for every file already downloaded. On a required column that means `missing_column` everywhere. Announce it.

## How do I keep Excel, the form and /service in sync?

`createSampleSchema` is the one truth. Each face has a test that stays red until a new field reaches it:

| Face       | Red until done                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form       | `FIELD_TAB` in `sample-form-tabs.ts` fails to compile                                                                                                      |
| Excel      | the coverage test in `columns.spec.ts`                                                                                                                     |
| `/service` | the coverage test in [core-path.spec.ts](../packages/domain/src/sample/core/core-path.spec.ts), then a row in [igsn-core-mapping.md](igsn-core-mapping.md) |

Both coverage tests walk the schema minus an explicit exclusion list:

```ts
// core-path.spec.ts
const NOT_IN_CORE = ["localIdDescription", "attachments"];
const unmapped = Object.keys(createSampleSchema.shape).filter((field) => {
  const probe = `${field}.leaf`;
  return !NOT_IN_CORE.includes(field) && toCorePath(probe) === probe;
});
expect(unmapped).toEqual([]);
```

A field Core has no slot for goes in `NOT_IN_CORE`, with the reason in the PR. Two more habits keep the faces aligned. A display condition calls the same `domain` predicate in the form, in `CONDITIONAL_FIELDS` and in the schema's `checkSample`. A requirement comes from `samplePublishRequirements` alone.

## How do I find why a generated template or a report is wrong?

| Symptom                                                    | Where                                                                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A number reads as text, a yes/no as a string               | `COLUMN_KINDS` ([column-kind.ts](../packages/api/src/sample/import-template/column-kind.ts)), the type at the column's `path` in the JSON schema of `createSampleSchema`                    |
| The "\*" is missing or on the wrong column                 | `marked()` in `columns.ts`, driven by `PUBLISH_BLOCKER_PATH`                                                                                                                                |
| An old template is refused with `missing_column`           | `required-columns.ts`, the required set and what `IMPORT_DEFAULTS` and conditions take out of it                                                                                            |
| A dropdown is empty or offers the wrong values             | the block named by the column's `block` in `vocabulary-sheet.ts`, labels from [labels.ts](../packages/api/src/sample/import-template/labels.ts)                                             |
| A cell is grey when it should not be, or a prompt is wrong | its entry in `conditional-fields.ts`                                                                                                                                                        |
| An uploaded value lands in the wrong field                 | [template-layout.ts](../packages/api/src/sample/import-template/template-layout.ts) (header match), `build-sample-inputs.ts` (value at `path`)                                              |
| An issue points at the wrong row or column                 | `placeOf` in [validate-samples.ts](../packages/api/src/sample/import-template/validate-samples.ts)                                                                                          |
| An export cell is wrong or greyed                          | [sample-row.ts](../packages/api/src/sample/bulk-edit/sample-row.ts) for the value, `isFrozen` in [export-workbook.ts](../packages/api/src/sample/bulk-edit/export-workbook.ts) for the grey |
| A report line reads as a raw code                          | `IMPORT_ISSUE_LABELS` in [import-issue-label.ts](../packages/admin/src/samples/import-issue-label.ts) and both admin catalogs                                                               |

## Good to know

- Downloaded templates live long. Headers match by name, so every file ever downloaded stays uploadable (ADR [0051](adr/0051-excel-import-label-contract.md)). A new required column is the one change that breaks them.
- The download dialog's choices are one JSON cell, Read me `C1`: `{ provenanceStatus, materialPath, manualGroupLabel }`. A new pre-fill kind touches `prefillOf`, `possibleLabelsOf` and `withoutPrefilledRows`.
- A clean upload queues every sample as `publishing` (ADR [0052](adr/0052-async-import-publication-via-publishing-status.md)). One issue anywhere answers 422 for the whole file.
- Excel caps a validation formula at 255 characters (a spec checks) and a sheet name at 31. A file holds `MAX_IMPORT_ROWS` samples at most.
- "Parent IGSN" and "Process steps" exist only when the dialog asks for sub-samples. Location and collection date are inherited (ADR [0053](adr/0053-ancestor-location-inheritance.md)).
- Attachments match staged uploads by exact file name (ADR [0054](adr/0054-tus-staged-uploads-for-import-documents.md)).
- Build and parse run one at a time through `queueBuild`. Keep per-cell work cheap.
- The legacy dump import (`packages/api/scripts/import-legacy.ts`, ADR [0027](adr/0027-legacy-dump-import.md)) is another mechanism.
