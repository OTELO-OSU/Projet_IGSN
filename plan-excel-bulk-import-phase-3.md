# Phase 3: parse, validate and report the Excel import (no writes)

## Context

Phase 2 (on this branch) lets a user download the template and post a filled workbook to `POST /admin/samples/import`, which checks size, extension and media type and answers 202.
Phase 3 makes that route parse the workbook, turn every row into a `createSampleSchema` input, validate it as a published sample, and answer the full error list.
Decision (user): validation and the report run **on the server only**. The route answers 422 with every issue and admin renders them as a table. No exceljs in admin, no validator in the browser.
Still no DB writes: a clean file answers 202 as today (phase 4 turns that into the import).

## Response contract (domain)

New `packages/domain/src/sample/import/import-report.ts`:

- `importIssueCodeSchema`: `z.enum` of the import's own codes: `unreadable_file`, `missing_sheet`, `missing_column`, `duplicate_column`, `no_sample`, `too_many_rows`, `missing_sample_key`, `duplicate_sample_key`, `unknown_sample_key`, `unknown_value`, `parent_level_missing`, `not_a_number`, `not_a_date`, `not_applicable`, `duplicate_value`.
- `importIssueSchema`: `{ sheet, row?, column?, code: string, message? }`. `code` is an import code, a publish blocker, a domain `params.code` (e.g. `collection_date_order`) or a zod issue code; `message` carries zod's text for the last kind.
- `invalidImportSchema`: `{ error: "Invalid import", issues: importIssue[] }`, parsed by admin.

## API: the pipeline

Four steps, each only reached when the previous one found no issue, since a broken structure would otherwise repeat the same error on every row:

1. **Open**: bytes to an exceljs workbook.
2. **Validate the template**: the workbook's structure against `columns.ts`, producing a `TemplateLayout`.
3. **Parse**: every row to a plain JSON `createSampleSchema` candidate, reading cells only through the layout.
4. **Validate the samples**: `publishedSampleSchema` per candidate.

Steps 1 and 2 decide whether the file is processable: any issue there stops everything, after collecting all of that step's issues. Steps 3 and 4 collect every issue before answering.

Files in `packages/api/src/sample/import-template/`, next to `columns.ts`, which the original plan already names as the importer's column map.

### Step 1: open (`open-workbook.ts` + `unzipped-size.ts`, specs)

- `unzipped-size.ts` is a zip-bomb guard: the 20 MB cap only bounds the compressed bytes, and exceljs inflates the whole archive in memory (the original plan's "On exceljs" section asks for it).
- It sums the uncompressed sizes declared in the zip central directory (EOCD scan, ~20 lines of `DataView`), refusing Zip64 and anything over 100 MB.
- `// ponytail: declared sizes only, a lying archive still inflates; count inflated bytes if the exceljs read path gets audited`.
- Then `ExcelJS.Workbook().xlsx.load` runs inside the existing `queueBuild` (`build-queue.ts`), so only one request at a time holds a parsed workbook.
- A guard refusal or a load throw gives `unreadable_file`.

### Step 2: validate the template (`template-layout.ts` + spec)

`templateLayout(book) -> { layout, issues }`. Reads no data row.

- **No version or `Read me` check**: the template will become customisable, so the file is judged by its headers alone.
- **Sheets** are found by name. `Samples` is mandatory. A child sheet may be absent when none of its columns is required; its fields are then absent from every sample.
- **Header row**: row 2 of each sheet, as the template contract states. Row 1 (the groups, with merged cells) is never read.
- **Header matching**: each header cell of row 2 is normalised (trimmed, inner whitespace collapsed, trailing `REQUIRED_MARKER` stripped, lower-cased) into a `header -> column number` map. Each `columns.ts` entry, normalised the same way, is looked up in that map.
- **Result**: the `TemplateLayout` lists, per sheet, the `columns.ts` entries actually present with their column number in _this_ file. Steps 3 and 4 never use a position from `columns.ts`.

What each change to the file does:

| Change in the uploaded file           | Result                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Column moved                          | Found by name at its new position: no effect.                                                               |
| Column inserted (unknown header)      | Ignored.                                                                                                    |
| Optional column deleted               | Its field is left out of every sample.                                                                      |
| `Sample #` deleted                    | `missing_column`: the file is unprocessable, stop.                                                          |
| Always-required column deleted        | `missing_column`: the file is unprocessable, stop.                                                          |
| Conditionally required column deleted | Not a structural error: parsing goes on, and step 4 fails only the rows that need it.                       |
| Column renamed                        | Same as deleting it plus inserting an unknown one.                                                          |
| Same header twice in a sheet          | `duplicate_column`, then stop, since we cannot tell which to read.                                          |
| Child sheet deleted                   | Its fields are left out of every sample, like its columns; `Samples` itself is mandatory (`missing_sheet`). |
| Rows inserted or deleted in the data  | Harmless: rows are read wherever they are, and child rows join on the `Sample #` value, not the row number. |

**Unprocessable file.** Step 2 fails the whole file, one `missing_column` per absent header, and nothing is parsed or validated, when any of these is absent:

- `Samples` (`missing_sheet`).
- `Sample #`, on every data sheet present, since the references between sheets join on it.
- An **always-required column**: one every sample must fill to be published whatever else it holds, like `Name`, `Nature`, the collection date, or the material levels down to the publish frontier.

**Always-required columns are derived, not listed** (`required-columns.ts` + spec), so they follow the domain like the rest of `columns.ts`:

- Parse an empty candidate (`{}`) with `publishedSampleSchema` once at module load. The issue paths are exactly what a sample must hold when nothing triggers a condition: schema-required fields (`name`) and unconditional publish blockers (`nature`, `type`, `material`, `description.collectionDate`, `scientificContext.provenanceStatus`, `existenceStatus`, `availabilityStatus`).
- Conditional blockers (`materialOtherName`, collector and chief scientist names, `location`, `collectionOrigin`) do not fire on an empty candidate, so they stay out.
- An issue path maps to the `Samples` columns at or under it, dropping any column governed by `CONDITIONAL_FIELDS` (so `Collection date time zone`, only for the hour precision, stays optional while precision, start and end are required).
- A hierarchy keeps its levels down to its **publish frontier**: the deepest level at which a path first becomes complete (`isMaterialComplete`, `isSampleTypeComplete`, the same functions the `*_incomplete` blockers call), i.e. the depth of the complete paths whose parent is not complete.
  - Material: `Material (level 1)` to `(level 3)`, the tree's levels 0 to 2 (`rock_and_sediment`, its five kinds, then ADR 0037's niveau 1). `mineral` is complete at level 2, but the other kinds need level 3, so the column is required.
  - Sample type: `Sample type (level 1)` and `(level 2)`.
  - Deeper levels (material 4 to 9) stay optional columns.
- The spec pins the resulting header list, so a domain change that makes a field required shows up in review.

Every other absent column simply leaves its field out, and parsing proceeds to validation, which reports the consequences row by row:

- A conditionally required column (`Other material name`, `Chief scientist first name`...): step 4 fails only the rows whose publish blocker fires, each issue naming the deleted column.
- A hierarchy whose level 2 is deleted while level 3 is kept: a filled level 3 cell gives `parent_level_missing` on that row.
- A condition driver deleted (e.g. `Oriented sample`) while a governed column is kept: a filled governed cell gives `not_applicable` on that row.

### Step 3: parse (`read-rows.ts`, `column-kind.ts`, `resolve-label.ts`, specs)

`readRows(book, layout) -> { samples: { row, input, rowsByPath }[], issues }`.

- **Cells**: a `Date` stays a `Date`, a formula gives its `result`, a hyperlink its `text`, anything else `cell.text`. A trimmed empty string is absent.
- **Sample rows**: data from row 3. A row counts when any present column but `Sample #` is filled. None gives `no_sample`, more than `MAX_IMPORT_ROWS` gives `too_many_rows`. A counted row with an empty or repeated `Sample #` gives `missing_sample_key` / `duplicate_sample_key`.
- **Child rows**: a row counts when any present column but `Sample #` and the lookup column is filled. Its `Sample #` must match a counted sample row, else `unknown_sample_key`.
- **Type per column** (`column-kind.ts`): walks `createSampleSchema` (zod 4 `def`: optional, nullable, pipe, object, discriminated union, array) to find, for each column path, `string` or `number` and the array prefix it sits under. Built once at load, with a spec asserting every `DATA_SHEETS` path resolves (a drift guard like `columns.spec.ts`). So a `123` typed in `Local ID` becomes `"123"`, and a text cell `"45.2"` in `Latitude` becomes `45.2`; a non-numeric one gives `not_a_number`.
- **Vocabularies** (`resolve-label.ts`): reverse maps built from `VOCABULARY_BLOCKS` (`vocabulary-sheet.ts`), the data the generator used.
  - Flat block: label to code, plus code to code, so a power user's raw code is accepted. Geological ages go back to numbers, `yes_no` to booleans.
  - Hierarchy: level by level, `parentPath + label` or `parentPath + segment` to path, starting from the previous level's resolved path, so the 31 `other` labels stay unambiguous.
  - An unknown value gives `unknown_value`; a filled level under an empty one gives `parent_level_missing`.
  - Region is the one special case: `country.FR` / `ocean.x` becomes `{ kind: "country", country }` / `{ kind: "ocean", oceanSea }`.
- **Dates**: a `Date` cell becomes `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` when the row's precision is hour; a text cell is passed as is for zod to judge.
- **Assembly**: a value is set at its column's dotted path, so an object exists only when one of its cells is filled. On child sheets, a column under an array prefix builds one array element per row (or pushes the scalar, for the value sheets); any other column sets a scalar on the sample, and a second differing value gives `duplicate_value` (the storage-condition readings).
- **`not_applicable`**: for each `CONDITIONAL_FIELDS` entry with a condition, a filled governed cell on a row where the condition fails. Same sheet-local rule as `addGreyRules`, so it matches the greyed cells the user sees, and it catches a wrong position branch that zod's non-strict objects would otherwise strip silently.
- **`rowsByPath`** records which sheet and row fed each array element, for step 4.

### Step 4: validate the samples (`sample-issues.ts` + spec)

- `publishedSampleSchema.safeParse` per candidate: `createSampleSchema` plus the publish blockers, since a clean file imports as published.
- Each zod issue becomes `{ sheet, row, column, code: params.code ?? code, message }`.
- Sheet and row come from `rowsByPath` for an array path, else the sample's `Samples` row.
- Column: the header of the first `columns.ts` column (not only the layout's, so a deleted column is still named) at or under the issue path (`isPathAtOrUnder`), walking up the path until one matches, else none (blocker paths like `location.position`).

### Route

`admin-routes.ts`: the `/import` handler runs the four steps and answers `422 { error: "Invalid import", issues }` on any issue, else 202 as now.

### Specs and fixtures

- Fixtures are built in the specs from `importTemplateWorkbook(3)`, filled and edited through exceljs, never committed binaries, so the headers never go stale.
- `template-layout.spec.ts`: one case per row of the table above, a deleted `Sample #`, and a deleted always-required column, each stopping before any row is read.
- `read-rows.spec.ts` also covers a hierarchy hole and a governed column without its driver; `sample-issues.spec.ts` a deleted conditional `*` column failing only the row that needs it.
- `read-rows.spec.ts` / `sample-issues.spec.ts`: clean file, clean file with columns reordered and an optional one deleted, bad vocabulary label, raw code accepted, dangling `Sample #`, publish blocker, wrong position branch; each asserts the exact issue list.
- `route.spec.ts`: one 422 case asserting the body shape. Its current 202 case (the empty template) becomes the `no_sample` 422, and the clean fixture takes the 202.

## Admin

- `use-import-samples.ts`: on 422 parse the body with `invalidImportSchema` and return the issues through the mutation (no toast); other errors keep the toast.
- `import-issue-label.ts`: exhaustive `Record<ImportIssueCode, (issue) => string>` over new `import_issue_*` messages in `admin/messages/en.json`, falling back to `publishBlockerLabel` (`publish-blocker-label.ts`) for a blocker code, then to the server `message`.
- `import-report.tsx` + browser spec (`add-admin-component` skill): one design-system `Table` per sheet (heading = sheet name, columns Row / Column / Problem), in a scrollable area inside the existing dialog under the drop zone. Picking a new file clears the report.
- `import-samples-dialog.spec.tsx` gets the 422 case.

## Docs

- ADR `docs/adr/0050-excel-import-label-contract.md`: the template's contract is headers matched by name (only `Sample #` and the always-required columns mandatory), labels resolved per parent, raw codes tolerated, whole-file rejection, validated and reported server-side only (rejected option: browser pre-validation, with its cost).
- Update phase 3 in `plan-excel-bulk-import.md`: server-only report, row cap is `MAX_IMPORT_ROWS` (500), fixtures generated not committed.

## Verification

- `pnpm test --project @projet-igsn/api` and `--project @projet-igsn/admin`; `pnpm lint:check` (type gate).
- `make test-e2e` once: download template, fill a bad value via exceljs in the test, upload, read the report table (the e2e the original plan asks for).
- Manual: `make dev`, download the template, fill two rows in LibreOffice with one mistake, upload, read the report.
- No env var, volume or service: no compose change.
