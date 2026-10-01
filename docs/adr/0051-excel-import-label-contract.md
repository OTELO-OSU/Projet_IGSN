# 0051. The uploaded workbook's contract

Date: 2026-09-25

## Status

Accepted.

## Context

Phase 3 of the Excel bulk import parses and validates the workbook a researcher uploads (`POST /admin/samples/import`), reporting every issue with no write. The generator (phase 1) and the parser (phase 3) needed to agree on how strictly the file must match the template it came from, and where validation runs.

## Decision

- Columns are matched by header name on row 2, never by position: a reordered or inserted column is survivable, and a renamed one reads as deleted.
- No template version check. The workbook drops its version gate: the template is meant to become customisable, so pinning parsing to one generated version would break on the first customisation.
- Only two kinds of column make the whole file unprocessable if absent: `Sample #`, and the columns `required-columns.ts` derives from the domain (`createSampleSchema`'s own required fields plus the unconditional publish blockers, hierarchies included down to their publish frontier). Conditional fields are excluded even when always-required in some branch. Any other missing column just leaves that field out of every row, reported per row instead if a row still needs it.
- Vocabulary labels are resolved per parent, from the same blocks the template generator writes (`vocabulary-sheet.ts`), so the generator and the parser never drift apart. A raw snake_case code or dot-path is also accepted where a label is expected, since tolerating a power user typing it costs nothing.
- Any issue anywhere rejects the whole file: `POST /admin/samples/import` answers 422 with `{ error: "Invalid import", issues: [{ sheet?, row?, column?, value?, code, message? }] }` and nothing is imported.
- Reading a row converts no value, and a cell it cannot map (an unknown label, a text in a numeric column, a hierarchy level under an empty one, a cell another field excludes) goes to `publishedSampleSchema` untouched, so the import reports what the api and the form would.
- Every key, schema and publish-blocker error is collected into one report across every row, so a clean sample's errors never hide behind another row's. Only a badly formatted file stops before that report runs: an unreadable file, a missing `Samples` sheet, a missing `Sample #` or always-required column, a duplicate header, or a row count outside `1..MAX_IMPORT_ROWS`.
- Validation and the report run on the server alone. The admin app only uploads the file and renders the returned issues; it does not parse the workbook.

## Consequences

- Widening or renaming a template column is a `columns.ts` change alone; no second header-position map to keep in sync.
- Customising the template needed no version gate; see the amendment below.
- `required-columns.ts` must stay derived from the domain (`createSampleSchema`, `samplePublishBlockers`, the hierarchy completeness helpers), never a hand-maintained list, or it silently drifts from what actually blocks publication.
- Every parse and validation dependency (exceljs, the vocabulary blocks, the publish blockers) stays in `api`; `admin` carries none of it.
- The server parses the upload with no unzipped-size guard: uploads are authenticated and rate limited to 5 per minute, so a crafted archive exhausting the api's memory is an accepted risk rather than a JSZip-mirroring archive check.

## Amendment: customized template

The template download can be customized by provenance status, material path (up to 2 levels, never mineral or synthetic) and one manual group; these additions extend the contract.

- The workbook records the customization on the Read me sheet: `C1` holds JSON `{provenanceStatus, materialPath, manualGroupLabel}`, codes for the first two and the group's label for the third, since group labels come from no static map.
- Upload reads `C1` back and recomputes the pre-filled labels from it; dropped columns need nothing, since headers match by name.
- A sample row equal to its pre-fill is blank, so an untouched pre-filled row is not a sample.
- Child rows keyed to a blank row are `unknown_sample_key` orphans.
- Every template carries a "Manual group" column on `Samples`, one group per sample, its dropdown reading a block appended to `Vocabularies` per request from the requester's attachable groups by label.
- A chosen group pre-fills that column, fixed like the other pre-fills.
- Upload resolves a filled "Manual group" label against the importer's attachable groups, never the requester's, and attaches it to the created sample.
- A label naming none of them rejects its row with `unknown_manual_group`.
- `POST /admin/samples/import-template/reservation` takes the same optional customization as the download, so reserved `Sample #` IDs land in the customized workbook.
- A manual group that cannot be attached is a 422 before the sequence advances, burning no numbers.
- A customized template carries the "Parent IGSN" column only when the optional `subSamples` flag (download query param, reservation body field) is true, the uncustomized one always carrying it.
- The flag stays out of `C1`, since upload reads actual headers and treats that column as optional.
- Six more optional flags (`physicalDescription`, `age`, `conservationSecurity`, `repository`, `relatedDocuments`, `geologicalContext`) each map to one column group, checked by default in the dialog.
- A flag sent false drops the group's columns, and any child sheet left with only key columns (Storage conditions, Rights holders, Relations).
- Like `subSamples`, these flags stay out of `C1`, since dropped columns need nothing and headers match by name.
- The template gained a "Geological context" column group, moved out of Location, so the row-1 groups now include one form section alongside the form tabs.
- "Existence status" and "Availability status" leave the always-required set.
- Present, they come pre-filled with the domain defaults (`DEFAULT_EXISTENCE_STATUS` "exists", `DEFAULT_AVAILABILITY_STATUS` "available"), editable with their dropdown kept.
- Absent, the server applies those defaults before validation (`IMPORT_DEFAULTS` in `required-columns.ts`).
- A row whose only values equal its pre-fill is blank on every template, customized or not.

## Rejected option

Validate in the browser first, so a researcher sees mistakes before uploading. Rejected: it would move the column layout, the vocabulary resolution and the conditional-field rules from `api` to `domain` so both packages could read them, add `exceljs` (~950 KB) to `admin`, and run the same validator twice on every clean file, all for the sole gain of skipping one upload of a file capped at a modest size.
