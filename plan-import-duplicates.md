# Mass import: warn about suspected duplicates before importing

## Context

- The sample form warns before publishing when published samples share the same name, material and collector (PR #251, `findDuplicateSamples`, "Continue anyway").
- The xlsx import has no such check, so re-importing a workbook silently creates duplicate IGSNs.
- Goal: run the same check on every imported row before anything is uploaded or queued, show the warning, and let the user import anyway.

## Approach

When the user clicks Import, the admin first sends the xlsx alone to a new check endpoint.

- If no duplicates are found, the import continues as it does today.
- If duplicates are found, the form's `DuplicateSamplesDialog` opens before any document is uploaded. "Continue anyway" runs the normal import, and Cancel leaves the dialog as it was.
- The guard stays client-side only, exactly like the admin form. `POST /admin/samples/import` is unchanged.

### Domain

- In `packages/domain/src/sample/import/import-report.ts`, add `importDuplicateSchema = { row: int, duplicates: SuspectedDuplicate[] }` and its inferred type `ImportDuplicate`.
- Reuse `toDuplicateCriteria` from `domain/sample/publication/suspected-duplicate.ts` as is.

### API

1. Extract the opening steps of `validateImport` into a `parseImport(bytes)` helper in `api/src/sample/import-template/validate-import.ts`:
   - `openWorkbook`
   - `templateLayout`
   - `readRows`
   - `withoutPrefilledRows`

   The helper returns either `{ parsed }` or `{ issues }`, and `validateImport` keeps its current behavior.

2. Batch the duplicate query in `api/src/sample/service/find-duplicate-samples.ts`, so that every row is checked in one SQL statement and the form and the import share one predicate.
   - Add `findDuplicateSamplesOfEach(db, criteria: readonly DuplicateCriteria[], exclude?): Promise<SuspectedDuplicate[][]>`. The result is aligned with the input by index.
   - Send all the criteria as one jsonb parameter, so the parameter count stays the same at 1 row or 500.
   - The SQL shape: `jsonb_to_recordset(...) as k(index, name, material, collector_user_id, collector_firstname, collector_lastname)`, then `left join "user" ku` on `k.collector_user_id`, then `cross join lateral` (the current select over `sample c` / `user cu`, with `order by c.igsn limit 20`).
   - The predicate reads `k.*` columns instead of bound JS values.
   - `sameCollector` currently branches on JS nulls; that branch moves into one SQL `case`:
     - When `k.collector_user_id` is set, keep the current user-id `case`, reading the account names from `ku`.
     - When both `k` names are null, use `not HAS_COLLECTOR`.
     - Otherwise use `sameNames(k.collector_firstname, k.collector_lastname)`.
   - `findDuplicateSamples(db, criteria, exclude)` becomes the first element of `findDuplicateSamplesOfEach(db, [criteria], exclude)`, so the form keeps its behavior on the same predicate. Its existing spec must stay green unchanged.
   - Before writing the from-clause, read the Kysely docs for raw table functions with a column list in Context7. If the builder can't express it, the whole statement may be one `sql` template.
3. In `domain/src/sample/repository.ts`, add `findDuplicatesOfEach(criteria: readonly DuplicateCriteria[]): Promise<SuspectedDuplicate[][]>` next to `findDuplicates`, and wire it in `api/src/sample/repository.ts` with `tx(findDuplicateSamplesOfEach)`.
4. Add `api/src/sample/import-template/find-import-duplicates.ts`, exporting `findImportDuplicates(bytes, findDuplicatesOfEach): Promise<ImportDuplicate[]>`.
   - Wrap it in `queueBuild`, then call `parseImport`.
   - If the workbook has issues, return `[]`, since the import itself reports them.
   - Otherwise call `buildSampleInputs(parsed)`, then map each candidate through `toDuplicateCriteria(candidate.input)`. Narrow `Json` to `DuplicateCandidate` with a small type guard, and drop the candidates that give `null`.
   - Make one `findDuplicatesOfEach` call, then keep only the rows that have at least one hit.
5. In `api/src/sample/admin-routes.ts`, add `POST /admin/samples/import/duplicates`.
   - Validate the body with `validateImportUpload`, which already checks that the file is an xlsx of at most 20 MB.
   - It answers `{ data: ImportDuplicate[] }`.
   - Declare the route next to `/import`.

### Admin

1. Add `admin/src/samples/use-check-import-duplicates.ts`. It is a `useMutation(file)` that POSTs FormData and parses the response with `importDuplicateSchema`. On error it shows the toast `m.duplicate_samples_check_error()`. It follows the pattern of `use-check-sample-duplicates.ts`.
2. In `admin/src/samples/import-samples-dialog.tsx`, change `onImport(file)` to:
   - Run `checkDuplicates.mutateAsync(file)`, aborting if it fails.
   - If any row has duplicates, set `pendingDuplicates` state, which renders `<DuplicateSamplesDialog>`.
     - Its `duplicates` are the hits from every row, flattened and deduplicated by id.
     - Its `note` is `m.import_samples_duplicates_note({ rows })`, listing the workbook row numbers.
     - Confirm runs the existing `importSamples.mutate(...)`.
   - Otherwise run the existing `importSamples.mutate(...)` directly.
   - While the check is pending, disable the Import button by passing `isReady && !checkDuplicates.isPending`.
3. In `admin/messages/en.json`, add `import_samples_duplicates_note`: "Rows {rows} of the workbook match published samples."

## Tests (TDD)

- **api** `find-duplicate-samples.spec.ts`:
  - Add one `findDuplicateSamplesOfEach` case where two criteria get their own hits, aligned by index.
  - Add one case where a no-collector entry and a named-collector entry are mixed in the same batch.
- **api** `find-import-duplicates.spec.ts`:
  - A row that matches a published sample is returned with its row number.
  - A row with no match, and an unreadable workbook, both give `[]`.
  - Use the `kysely-vitest-postgres` skill and `import-fixture.ts`.
- **api** route spec:
  - 200 with `data`.
  - 400 on a non-xlsx file, in `admin-routes-duplicates.spec.ts`.
- **admin** `import-samples-dialog.spec.tsx`:
  - With a duplicate, Import shows the dialog and no import request is sent. "Continue anyway" then sends the import.
  - Without a duplicate, Import sends the import directly.
- **e2e** `e2e/admin/sample-import.spec.ts`: import the same workbook twice. The second time the warning appears, and "Continue anyway" queues the import.

## Skipped

- **Duplicates inside one workbook:** not checked, because the request is about samples already imported. Add when asked.
- **Samples still `publishing`:** not matched, which is the same rule as the form (published only).

## Verification

- `pnpm test --project @projet-igsn/api`, `pnpm test --project @projet-igsn/admin` and `pnpm test --project @projet-igsn/domain`.
- `pnpm lint:check` and `pnpm fmt:check`.
- `make test-e2e`, run once at the end.

## Cleanup

- Once implemented and verified, delete `plan-import-duplicates.md` from the repo root in the final commit.
