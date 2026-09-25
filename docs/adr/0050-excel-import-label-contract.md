# 0050. The uploaded workbook's contract

Date: 2026-09-25

## Status

Accepted.

## Context

Phase 3 of the Excel bulk import parses and validates the workbook a researcher uploads (`POST /admin/samples/import`), reporting every issue with no write. The generator (phase 1) and the parser (phase 3) needed to agree on how strictly the file must match the template it came from, and where validation runs.

## Decision

- Columns are matched by header name on row 2, never by position: a reordered or inserted column is survivable, a renamed or deleted one is not.
- No template version check. The workbook drops its version gate: the template is meant to become customisable, so pinning parsing to one generated version would break on the first customisation.
- Only two kinds of column make the whole file unprocessable if absent: `Sample #`, and the columns `required-columns.ts` derives from the domain (`createSampleSchema`'s own required fields plus the unconditional publish blockers, hierarchies included down to their publish frontier). Conditional fields are excluded even when always-required in some branch. Any other missing column just leaves that field out of every row, reported per row instead if a row still needs it.
- Vocabulary labels are resolved per parent, from the same blocks the template generator writes (`vocabulary-sheet.ts`), so the generator and the parser never drift apart. A raw snake_case code or dot-path is also accepted where a label is expected, since tolerating a power user typing it costs nothing.
- Any issue anywhere rejects the whole file: `POST /admin/samples/import` answers 422 with `{ error: "Invalid import", issues: [{ sheet, row?, column?, code, message? }] }` and nothing is imported.
- Validation and the report run on the server alone. The admin app only uploads the file and renders the returned issues; it does not parse the workbook.

## Consequences

- Widening or renaming a template column is a `columns.ts` change alone; no second header-position map to keep in sync.
- Customising the template (a later goal) needs no parser change, since nothing pins a version.
- `required-columns.ts` must stay derived from the domain (`createSampleSchema`, `samplePublishBlockers`, the hierarchy completeness helpers), never a hand-maintained list, or it silently drifts from what actually blocks publication.
- Every parse and validation dependency (exceljs, the vocabulary blocks, the publish blockers) stays in `api`; `admin` carries none of it.

## Rejected option

Validate in the browser first, so a researcher sees mistakes before uploading. Rejected: it would move the column layout, the vocabulary resolution and the conditional-field rules from `api` to `domain` so both packages could read them, add `exceljs` (~950 KB) to `admin`, and run the same validator twice on every clean file, all for the sole gain of skipping one upload of a file capped at a modest size.
