# Create an import template from a published sample

## Context

Let a researcher generate a customized import template prefilled from an existing sample. New "Create an import template" action on each eligible sample (list row + sample page), opening the existing `CustomizeTemplateDialog` prefilled; the list's actions column becomes one ellipsis dropdown (template / sub-sample / duplicate). Eligible = `published` or `withdrawn`, material not mineral/synthetic. Purely client-side: a list row is a full `Sample`, no API change.

## Changes

1. **Predicate**: new `packages/domain/src/user-sample/can-create-import-template.ts`: status published|withdrawn, material non-null and `isMassImportableMaterial(material)`.

2. **Prefill mapper**: new `packages/admin/src/samples/template-customization-of-sample.ts`, pure `Sample -> TemplateDialogValues`:
   - `materialPath`: first 3 dot-path segments, via `toHierarchyPath`.
   - `groupId`: `manualGroups[0]?.id ?? ""`; `provenanceValue`: `scientificContext?.provenanceStatus ?? ""`; `subSamples`: `parents.length > 0`.
   - `sections` checked iff the sample has data there (per `TEMPLATE_SECTIONS` in `api/src/sample/import-template/columns.ts`): `physicalDescription` = any `description` field except `collectionDate`; `age` = any `age` field non-null; `conservationSecurity` = `condition` or `security`; `repository` = `existenceStatus`, `availabilityStatus` or `repository`; `relatedDocuments` = `relations.length > 0`; `geologicalContext` = `geologicalContextDescription` or `physiographicEnvironment`.

3. **Dialog** (`customize-template-dialog.tsx`): optional `initialValues?: TemplateDialogValues` prop seeding the five `useState` initializers; prefilled callers mount it conditionally so they re-run per sample (existing `ImportSamplesDialog` instance untouched). Send `manualGroupId` only when in the attachable list (API 422s unknown ids). Footer label: Close instead of Back when `initialValues` set.

4. **List** (`sample-table.tsx`): new `sample-row-actions-menu.tsx` mirroring `sample-actions-menu.tsx` (ellipsis ghost button, `aria-label` "Actions for {name}", stopPropagation): template item (`onSelect`), sub-sample and duplicate links behind their existing predicates. `SampleTable` holds `templateSample` state and mounts the single prefilled dialog.

5. **Sample page**: `sample-actions-menu.tsx` gets optional `templateInitialValues`; when set, a "Create an import template" item after "Add sub sample" toggling the dialog. `routes/samples.$sampleId.tsx` passes it when `canCreateImportTemplate(query.data)`.

6. **i18n** (`packages/admin/messages/en.json` only): `sample_create_import_template`, `sample_row_actions`.

## Tests (TDD)

- New specs for the predicate (`it.each` pass/refuse) and the mapper (whole-value `toEqual` bare vs filled sample; `it.each` per section rule, incl. only-`collectionDate` → false and all-null `age` → false).
- `customize-template-dialog.spec.tsx`: prefilled values reach the download request; non-attachable group dropped.
- `sample-table.spec.tsx`: add `QueryClientProvider`; rework action tests to open the row menu then assert menuitems; template item shown on published+rock, absent on draft/mineral; clicking opens the prefilled dialog.
- `edit-sample-page.spec.tsx`: item present and opens the prefilled dialog on an eligible sample; absent otherwise.
- e2e page object `e2e/support/admin/sample-list.page.ts`: sub-sample helpers now open the row menu first.

## Decisions

- No ADR (admin-only UI, existing patterns). Several manual groups → prefill the first; all values stay editable.

## Verification

`pnpm test --project @projet-igsn/domain` and `--project @projet-igsn/admin`; `pnpm lint:check`; `make test-e2e` (read the verdict block); manual check in `make dev` of both entry points and ID reservation.

## Cleanup

Once implementation is done, delete the committed plan file from the repo root in the final commit.
