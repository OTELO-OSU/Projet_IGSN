# Excel bulk import of samples

## Context

We want mass import of samples. The model is too rich for CSV: ~200 fields, six hierarchical vocabularies (material alone has 742 dot-paths over 9 levels), ~40 flat enums, three true one-to-many children (relations, process steps, additional roles), and four discriminated unions. Researchers are the target audience and they are change-averse, so the entry surface has to guide them.

The deliverable is an `.xlsx` template that a researcher downloads, fills, and uploads. The template carries dropdowns for every controlled vocabulary and one tab per child table. Filled files are validated whole: **any error anywhere cancels the entire import**, and the browser shows a per-line report. A clean file is imported as **published** samples.

Scope of the fields: every field of `createSampleSchema` except four, deferred to a later phase:

- `parentIds`: no sub-sample import yet, so no `Parent` column and no lineage in the file. Every imported sample is a root.
- `processSteps`: deferred with the lineage, so no `Process steps` tab.
- `syntheticDetails`, and the synthetic material branch itself: the generator prunes `rock_and_sediment.synthetic_rock_mineral` out of the material dropdowns, and the synthetic columns are absent.
- `attachments`: files are uploaded separately.

Everything else the model carries (`id`, `igsn`, `status`, `owner`, the institutional trio, `createdAt` / `updatedAt` / `publishedAt`, sample roles) is server-set and already outside `createSampleSchema`.

That list of four is a single constant in `columns.ts`, and the drift-guard spec reads it, so widening the template later is one array edit with the guard still enforcing the rest.

Four phases, each shippable on its own. **One PR per phase**, merged before the next starts, each on its own branch whose name the developer gives before work begins. A phase's PR carries its own tests and, where the phase names one, its ADR.

---

## What Excel actually offers, and what we will use

All of the following are in the original ECMA-376 (2006) / ISO 29500 `.xlsx` spec, shipped in Excel 2007, and read unchanged by every Excel since, by LibreOffice and by Google Sheets. That is the answer to "no breaking change as Excel evolves": stay on the 2007 feature set and the file is effectively frozen.

| Need                                         | Excel feature                                                                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled-vocabulary dropdown               | `dataValidation type="list"` whose `formulae` is a range on a reference sheet (cross-sheet refs allowed directly since Excel 2010)                  |
| Hierarchical vocabulary (material, 9 levels) | one column per level, each level's dropdown cascading off the previous via `OFFSET(... MATCH(...) ... COUNTIF(...))` on a sorted parent/child block |
| One-to-many tables                           | one worksheet per child table, joined by an auto-incremented template-only `Sample #`                                                               |
| Referencing a sample row from a child tab    | list validation sourced from the `Sample #` column's range, plus a `VLOOKUP` helper column echoing the sample name                                  |
| Guidance in the cell                         | `promptTitle`/`prompt` (hover hint) and `errorTitle`/`error` with `errorStyle="warning"`                                                            |
| Keeping the reference data intact            | `sheetProtection` on the vocabulary sheet                                                                                                           |
| A 200-column sheet that is navigable         | frozen panes (`views: [{state:'frozen', xSplit, ySplit}]`), column widths, `outlineLevel` to group optional blocks                                  |

Deliberately **not** used, because each is a future breakage:

- Macros (`.xlsm`): blocked by default for internet-sourced files since 2022, and never run in Excel for web or on locked-down Macs.
- Dynamic-array and modern functions (`XLOOKUP`, `FILTER`, `UNIQUE`, `TEXTJOIN`, `LAMBDA`): Excel 2019/365 only, persisted with `_xlfn.` prefixes and rendering `#NAME?` elsewhere. `OFFSET`/`MATCH`/`COUNTIF`/`VLOOKUP` do the same job and date to Excel 2003.
- Defined names: `INDIRECT` on a defined name is the usual cascade recipe, but it forces name sanitising (names cannot start with a digit or collide with a cell reference) and it is exceljs's weakest API. The `OFFSET`/`MATCH` cascade needs none.
- Structured table references: Excel refuses `=Samples[Key]` inside a data validation formula. Plain `$A$2:$A$1001` ranges instead.
- ActiveX, form controls, Power Query.

Three limits to design around, not fight:

- **Excel validation is advisory.** Pasting into a validated cell replaces the validation and is never re-checked, and LibreOffice/Sheets round-trips degrade some rules. So the dropdowns are a typing aid and phase 3 is the only authority. None of the ten `superRefine` rules in `packages/domain/src/sample/sample.ts` and none of the 37 codes in `publication/sample-publish-blockers.ts` go into formulas.
- **An inline list is capped at 255 characters.** Every real vocabulary lives on a reference sheet and is referenced by range.
- **Excel has no multi-select cell.** The set-valued fields (`condition.storageConditions`, `scientificContext.funderOrganizations`, `.hostInstitution`, `economicInterestElements`) become `;`-separated free-text cells, with their allowed values listed on the vocabulary sheet and no dropdown.

The real long-term risk is not Excel, it is our own vocabulary drift: a workbook shipped today with 742 material paths is stale the next time someone edits a subtree. Hence the template is generated on request from the domain constants, never a checked-in binary.

---

## Workbook shape

| Tab                | Contents                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Read me`          | template version in `B1`, generation date, how `Sample #` links the tabs, that dropdowns are a guide and the server validates                                                                                                                                             |
| `Samples`          | one row per sample. `Sample #` plus every in-scope `createSampleSchema` scalar, nested objects flattened as `location.localityName`, hierarchies exploded one column per level                                                                                            |
| `Relations`        | `Sample #` + `Sample name` (lookup) + the `createSampleRelationSchema` fields                                                                                                                                                                                             |
| `Additional roles` | `Sample #` + `Sample name` (lookup) + role + person first/last                                                                                                                                                                                                            |
| `Vocabularies`     | protected; one block per flat enum and per hierarchy level, each `code \| label` (hierarchies: `parent label \| child label \| dot-path`), sorted. The validation ranges point at the **label** column; the code column is there for auditing and for the phase-3 mapping |

Hierarchy column counts follow the trees: material 9 (minus the pruned synthetic branch), resource type 3, collection method 3, physiographic environment 2, sample type 2, region 2 (`country` / `ocean` branch). Discriminated unions get a discriminant column plus every branch's columns: `location.position.type` (`point`/`area`/`line`), `scientificContext.provenanceStatus` (`field_sample`/`collection_specimen`) and each date range's `precision`, while `location.region` is carried as the two-level hierarchy instead. Only the matching branch is filled; phase 3 rejects the rest.

### Labels only, never technical identifiers

A researcher never types or picks a technical value. Every dropdown, in every tab, offers the **human label**; the snake_case code or dot-path stays on the `Vocabularies` sheet next to it, for auditing and for the phase-3 mapping, and nowhere else. This is a requirement, not a preference, and it applies past the obvious cases:

- `age.geologicalAgeMin` / `Max` are stored as integers 1..49 but offer the ICS stage names (`geologicalAgeLabel`).
- `repository.rightsHolder` holds ROR ids but offers the organisation names from `institutional-group/organization.ts`, and `repository.currentArchiveOsu` / `currentArchiveLaboratory` offer the OSU and UMR names.
- `location.region` offers country names (`countryLabel`, via `Intl.DisplayNames`) and sea names, never ISO-2 codes.
- The `;`-separated set-valued cells get no dropdown because Excel has no multi-select, but their reference block lists labels and the user separates labels, not codes.
- Units (`cm`, `ka`) and IANA time zones (`Europe/Paris`) stay as they are: those are the readable form.

Each cascade level keys off the concatenation of the preceding level columns, so a hierarchy list is always scoped to one parent and the reused segments (`other` appears 31 times in the material tree, `cliff` under four physiographic roots) stay unambiguous even as labels.

**This makes label uniqueness load-bearing**: phase 3 can only reverse a label if it is unique within its own list. A phase-1 spec asserts that for every flat enum and for every (parent, level) group of every hierarchy. A real collision fails the build, and is fixed either in the label catalog or, if two entries genuinely share a name, by the generator disambiguating those entries alone.

### The `Sample #` join key

A template-only integer, pre-filled `1..500` as **static values**, never persisted: phase 3 uses it to attach child rows and then throws it away.

- Static, not `=ROW()-1`. A formula silently renumbers when a row is deleted, re-pointing every child row at the wrong sample. A static integer leaves a dangling reference instead, which phase 3 reports.
- The child tabs validate `Sample #` against the whole pre-filled range, so a row typed past 500 still works.
- `1, 2, 3` tells a researcher nothing about which sample they are annotating, so each child tab carries a read-only `Sample name` column, `=IFERROR(VLOOKUP($A3, Samples!$A:$B, 2, FALSE), "")`. Ignored on import.
- Not locking the column: protecting `Samples` to freeze one column means unlocking every other cell and re-permitting row insertion, for a footgun phase 3 detects anyway (duplicate or missing `Sample #`). The `Read me` says not to edit it.

It stays the join key when lineage is added later: a `Parent` column would take either a `Sample #` from the same file or an existing IGSN.

### Constraints the generator must honour for the later phases

- **Row numbers must be the ones the user sees.** A group row on row 1, the column headers on row 2, data from row 3, no spacer rows, no merged cells in the data area. An error then reads "Samples, row 47".
- **The group row pins the template's own grouping, not its agreement with the form.** `columns.ts` spells the nine admin tab names itself, since `api` does not depend on `admin`.
- Nothing fails when the form reorders its tabs or moves a field between them, so someone must then edit `columns.ts` by hand.
- Tying the two together needs the grouping declared in `domain` and read by both, deliberately not taken here.
- **The workbook carries its version** in `Read me!B1`. Phase 3 refuses a file whose version it does not know, rather than mis-reading shifted columns. Columns are read by header name as well, so an inserted column is survivable.
- **Excel never blocks**: `errorStyle: "warning"`, so a legacy or pasted value can be entered and the server is what refuses it.

---

## Phase 1: generate the template, served by an API route

No UI. `GET /admin/samples/import-template` returns the `.xlsx`.

New, under `packages/api/src/sample/import-template/`:

- `columns.ts`: the ordered column spec per tab, giving the header, the `createSampleSchema` path it feeds, and which vocabulary drives it. Single source of truth for the layout, and later the importer's column map.
- `vocabulary-sheet.ts`: builds the `Vocabularies` blocks from the domain constants and returns each block's A1 range, so validation formulas are derived, never hand-typed.
- `workbook.ts`: assembles the exceljs workbook, returns a Buffer, cached at module level like the OpenAPI document in `packages/api/src/service-account/service-routes.ts`.
- `workbook.spec.ts`, `columns.spec.ts`.

Modified: `packages/api/src/sample/admin-routes.ts` adds the route, answering with the `Content-Disposition` and `X-Content-Type-Options: nosniff` headers already built by `packages/api/src/sample/attachment-download.ts`.

Reused, not rewritten:

- `expandPaths`, `pathChildren`, `pathSegment`, `isPathComplete` in `packages/domain/src/sample/path/`.
- `MATERIAL_HIERARCHY`, `SAMPLE_TYPE_HIERARCHY`, `COLLECTION_METHOD_HIERARCHY`, `PHYSIOGRAPHIC_ENVIRONMENT_HIERARCHY`, `RESOURCE_TYPE_HIERARCHY`, `REGION_HIERARCHY`.
- `createSampleLabels(m)` in `packages/domain/src/sample/create-sample-labels.ts`, fed `packages/domain/messages/en.json` mapped to `() => value`, as `packages/admin/src/samples/sample-labels.ts` already does.
- `hierarchyDescendantItems` / `hierarchyPathLabel` in `packages/design-system/src/lib/hierarchy.ts`. If `api` may not depend on `design-system`, those two move to `domain/sample/path/` rather than getting a second copy.

Dependency: `exceljs` into `packages/api` and the `pnpm-workspace.yaml` catalog, plus `pnpm.overrides` pinning its `uuid` and `tmp` (see "On exceljs").

No env var, no volume, no port, no new service, so no compose change under `.claude/rules/infra-parity.md`.

**Verification**: `pnpm test --project @projet-igsn/api` asserts the drift guard (every `createSampleSchema` key outside the four deferred ones is reachable from `columns.ts`, so adding a sample field fails until the template carries it), that no material path under `synthetic_rock_mineral` reaches the workbook, that no dropdown range contains a raw code, that every label is unique within its list, that each hierarchy block has exactly `expandPaths(...)`-many pairs, that the groups run once each along row 1, that headers are row 2 and `Read me!B1` holds the version, and that the generated Buffer reparses through exceljs with the material level-2 validation pointing at the range `vocabulary-sheet.ts` reported. Then a throwaway script writes the file to a scratch directory and it gets opened by hand in Excel and LibreOffice: material cascades nine levels, changing level 2 re-scopes level 3, the `Relations` tab's `Sample #` dropdown works and its `Sample name` fills in, `Vocabularies` is protected.

---

## Phase 2: admin UI, download and upload

- An "Import" button right next to Create on the admin sample list (`admin/src/routes/index.tsx`) opens a modal: a description, a "Download template" button, a drop zone for the filled `.xlsx`, Cancel and Import.
- "Download template" fetches the default 500-row template; customizing it is out of scope.
- `packages/admin/src/samples/use-download-import-template.ts` mirrors `use-download-attachment.ts` and reuses `save-blob.ts`.
- `packages/admin/src/samples/import-samples-dialog.tsx`: the modal, reusing `attachment-drop-zone.tsx` renamed to a generic `file-drop-zone.tsx` (single file, `accept=".xlsx"`), success/failure toast.
- `packages/domain/src/sample/import/import-validator.ts`: `importSamplesSchema` (size cap, `.xlsx` extension, xlsx media type), shared by the admin picker and the api.
- `POST /admin/samples/import` accepts the filled workbook as multipart, following the attachment upload at `admin-routes.ts` (`c.req.valid("form")`): size cap, extension and media-type check, nothing else. Answers 202 and discards the file.

This phase exists to land the plumbing (route, auth, multipart limits, UI) with no parsing risk.

**Verification**: an api spec posting the downloaded template back gets 202 and a non-xlsx gets 415; an admin browser spec drives the dialog.

---

## Phase 3: parse, validate, report. No writes.

Shipped as planned, with a few adjustments below. See [ADR 0050](docs/adr/0050-excel-import-label-contract.md) for the workbook contract, and [plan-excel-bulk-import-phase-3.md](plan-excel-bulk-import-phase-3.md) for the detailed phase plan.

- Read the workbook with exceljs, columns matched by header name on row 2. No template version check: the template is meant to become customisable, so no version gate to keep in sync.
- Only `Sample #` and the always-required columns (`required-columns.ts`, derived from `createSampleSchema` plus the unconditional publish blockers, hierarchies down to their publish frontier, conditional fields excluded) make the file unprocessable if missing. Any other absent column just drops that field, reported per row if still needed.
- Resolve every label back to its code or dot-path, per column and, for hierarchies, per parent, from the same vocabulary blocks the generator writes. A raw code is also accepted.
- Attach child rows by `Sample #`; a dangling or duplicate number is an error.
- Parse each assembled sample with **`publishedSampleSchema`**, since a clean file imports as published. Every row is a root sample, so no parent resolution.
- Map every issue to `{ sheet, row?, column?, code, message? }`.
- **Any issue anywhere means no import**: `POST /admin/samples/import` answers 422 with the whole report; admin renders it as a table grouped by sheet.
- Row count capped at `MAX_IMPORT_ROWS` (500), matching the template's pre-filled `Sample #` range.
- Validation and the report run on the server alone (ADR 0050); the admin app only uploads and renders the returned issues.

**Verification**: unit specs build fixture workbooks in-process from the generated template (`import-fixture.ts`), never a committed binary, covering a clean file, a bad vocabulary value, a dangling or duplicate `Sample #`, a missing required column, a publish blocker, and reordered/deleted optional columns. An e2e uploads an invalid fixture and reads the rendered report table.

---

## Phase 4: import

Only reached when phase 3 returns zero issues.

- **Pre-flight DataCite**: one cheap authenticated call against `DATACITE_API_HOST` before anything is written; if it fails, abort with a clear message and import nothing. `packages/api/src/datacite/config.ts` already holds host and key.
- One transaction for the whole batch, rows in sheet order since every sample is a root: `insertOwnedSample` then `publishSample(trx, id, "published", dataCite)` per row, the same pair `createPublished` in `packages/api/src/sample/repository.ts` uses for `POST /service/samples`. IGSN generation (`generateIgsnSuffix(id)`) and the DataCite `PUT` both already live inside `publishSample` / `syncDoi`, so nothing new is written for either.
- Sequential, not concurrent: `syncDoi` has a 10s timeout each, and DataCite rate limits.

**The one genuinely costly decision**: a mid-batch DataCite failure rolls the DB transaction back, but the DOIs already `PUT` remain registered at DataCite, pointing at landing pages that no longer exist. Two options, to settle before writing phase 4:

- _Accept and log_: roll back, log the orphan DOIs for manual cleanup. IGSN suffixes derive from the sample uuid, so a rolled-back uuid is never reused and the orphans are inert. Smallest diff.
- _Two-pass_: register every DOI with no `event` (DataCite draft state, deletable), commit the DB, then a second pass moving them to `publish`. Clean rollback, twice the calls, and `syncDoi`'s status-to-event map grows a case.

An ADR is due here: it is a public-contract and persistence decision with a reasonable rejected option. Also worth one in phase 3 if the label-keyed dropdown resolution survives review, since it fixes the template's contract.

**Verification**: `pnpm test --project @projet-igsn/api` with the Postgres fixture (`kysely-vitest-postgres` skill) and DataCite stubbed. The clean fixture creates N published samples with IGSNs; a stubbed DataCite failure on row 3 leaves zero rows in the database. `make test-e2e` for the full download, fill, upload, import round trip. Then `make dev` against the DataCite test instance for one real registration.

---

## On exceljs

It covers every feature above (`dataValidation`, per-sheet protection, `state: 'veryHidden'`, tables, frozen panes, `outlineLevel`, streaming writer), is MIT, and gets 10.7M downloads a week. The caveats, accepted:

- Last release 4.4.0, October 2023; maintainers inactive. The feature set we need is 2007-era OOXML and will not change, so a frozen library is tolerable.
- Two transitive advisories in its locked deps, `uuid@^8.3.0` and `tmp@^0.2.0`. Pin both through `pnpm.overrides` in the root `package.json`.
- Its known parser weaknesses (prototype pollution, unbounded decompression) sit on the read path, which phase 3 walks onto. Phase 3 must therefore cap file size and unzipped size before handing bytes to exceljs, and revisit the library choice if the audit looks bad by then. Phase 1 only writes, from our own data.
- Its workbook-level defined-name API is weak, which is why the cascade uses `OFFSET`/`MATCH` and no names at all.
