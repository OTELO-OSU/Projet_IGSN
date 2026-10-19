# Parent tab always present, parent pickable from creation

## Context

- On plain creation the admin sample form hides the Parent tab (`hasParentTab = parents.length > 0 || sampleId !== undefined`, `admin/src/samples/sample-form.tsx:168`), so it pops in after the first save.
- Wanted: every tab always rendered (create, draft, published), a tab with nothing to offer disabled rather than hidden, and a parent pickable on a draft, creation included.
- The backend already does the rest, no api/domain change:
  - `POST /admin/samples` accepts `parentIds` and checks eligibility (`admin-routes.ts:156-165`).
  - `PUT` lets a parentless draft gain one parent (`addSampleParents`).
  - DataCite is untouched while the child has no IGSN: `addSampleParents` marks the parent only `if (old.igsn !== null)`, `markForSynchronization` skips drafts, `listDoiChildren` lists only children holding an IGSN, and publishing the child marks its parents (`markParentsForSynchronization`).
  - Already covered by `api/src/sample/admin-routes-parents.spec.ts:363-364` (a draft child leaves the parent `synced`).
- Only the Parent tab is ever hidden today; Location and Scientific context are already disabled, not hidden.

## Changes (admin only)

1. `admin/src/samples/sample-form.tsx`
   - Drop `hasParentTab`.
   - Always render `<TabsContent value="parent">`.
   - Pass `hasParentTab: parents.length > 0 || offersParentPicker` into `isSampleFormTabDisabled` (rename the option to `hasParentContent` since its meaning changes).
2. `admin/src/samples/sample-form-tab-list.tsx`: remove the `.filter(... value !== "parent" || hasParentTab)` and the `hasParentTab` prop; the trigger's existing `disabled={isTabDisabled(value)}` does the work.
3. `admin/src/samples/sample-form-tabs.ts` `isSampleFormTabDisabled`: parent disabled when `!hasParentContent` (no stored parent and no picker), e.g. a series, or a contributor on a published parentless sample.
4. `admin/src/samples/sample-parent-tab.tsx`: drop the `m.no_parent()` fallback paragraph, now unreachable (tab disabled). Keep the `no_parent` message, still used as the picker's `clearLabel`.
5. `admin/src/routes/samples.create.tsx`: pass `canAddParent` on plain creation only (`!source && parents.length === 0`); `AddParentField` already takes `childId: undefined`, and `SamplePicker` makes `childId` optional.
   - Picking a parent at creation follows the edit flow: Location tab disabled by the existing `parentIds.length > 0 && !hasSoleParent` rule, the api inheriting location and collection date on insert (`insert-sample.ts:52-59`), which `add_parent_description` already says.
   - A series type picked after a parent is refused by `checkSample` on submit, as on edit today.

## Tests (TDD, `add-admin-component` skill)

- `sample-form.spec.tsx:3256-3267`: flip "no Parent tab on a parentless sample being created" to "Parent tab disabled when there is no parent and no picker".
- `sample-form.spec.tsx`: add "Parent tab enabled with a picker on creation when `canAddParent`" (no `sampleId`).
- `create-sample-page.spec.tsx`:
  - plain create shows the Parent tab with the picker.
  - picking a parent sends `parentIds` in the POST body (mirror `edit-sample-page.spec.tsx` "picking a parent sends parentIds").
  - `:627` / `:667` (out-of-reach parent, dropped duplicate parent): expect the tab present but disabled instead of absent.
- `edit-sample-page.spec.tsx:674`: a contributor on a published parentless sample now sees a disabled Parent tab instead of "No parent".
- `edit-sample-page.spec.tsx:1856`: the loop skipping `parent` may stay.

## Verification

- `pnpm test --project @projet-igsn/admin` and `pnpm test packages/api/src/sample/admin-routes-parents.spec.ts`.
- `pnpm lint:check` and `pnpm fmt:check`.
- `make dev`, then in the admin: create a sample, pick a published parent on the Parent tab, save as draft (tab stays put, parent read-only, webhook-sink/DataCite mock quiet), then publish and check the parent goes `pending` then `synced`.
- Grep `e2e/` for a Parent tab absence assertion (`sampleFormPage`, `sub-samples.spec.ts`), and run `make test-e2e` once at the end.

## Cleanup

- Last commit: delete `PLAN-draft-parent.md` from the repo root (`chore: remove the draft parent plan`).
