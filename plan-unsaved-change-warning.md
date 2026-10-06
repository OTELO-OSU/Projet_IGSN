# Warn before leaving the sample form with unsaved changes

## Context

The sample form spans several tabs, and a researcher who clicks a sidebar link, Cancel, Back, or reloads loses everything typed with no warning. The rule is a single predicate: the form holds changes not yet saved, whatever their cause. Yes warns, no proceeds. Covered exits: in-app navigation (links, Cancel, back/forward), tab close and page reload.

Two facts shape the design:

- Today `SampleForm` resets to clean when Save is clicked, before the server answers (`sample-form.tsx:414`), so a failed save leaves unsaved values in a "clean" form. The reset moves to after a successful save, so the form's own state answers the predicate.
- Tab switches are router navigations on the same path (`onTabChange` does `navigate({ search, replace: true })`), so the blocker only fires when the pathname changes.

No navigation guard exists anywhere in the repo. TanStack Router 1.170 ships `useBlocker` (`shouldBlockFn`, `enableBeforeUnload`, `withResolver`, `disabled`) and `navigate({ ignoreBlocker: true })`, which cover all of it.

## Design

### 1. `admin/src/samples/unsaved-changes-guard.tsx` (new)

`UnsavedChangesGuard({ isDirty })`:

- `useBlocker({ disabled: !isDirty, enableBeforeUnload: true, withResolver: true, shouldBlockFn: ({ current, next }) => current.pathname !== next.pathname })`.
- `disabled` handles both the in-app blocker and the native `beforeunload` prompt in one flag.
- Renders the admin `ConfirmDialog` (`admin/src/confirm-button.tsx`) controlled: `open={status === "blocked"}`, `onConfirm={proceed}`, `onOpenChange={(open) => open || reset?.()}`, `confirmLabel={m.unsaved_changes_leave()}`.
- Same shape as the delete confirm in `sample-actions-menu.tsx:116-131`.

### 2. `admin/src/samples/has-unsaved-attachment-changes.ts` (new)

Attachments live outside form state in `useAttachmentChanges`. Pure helper `hasUnsavedAttachmentChanges(saved: SampleAttachment[], changes: SampleAttachmentChanges): boolean`:

- true when `pending.length > 0`, `deletions.length > 0`, or an entry of `edits` makes `attachmentMetadata(saved, edit)` differ from `attachmentMetadata(saved, {})` (reuse `attachmentMetadata` from `use-attachment-changes.ts`).
- Comparing instead of clearing `edits` on commit keeps the edits on screen when the save fails after commit, and reads clean once the refetched sample carries them.

### 3. `admin/src/samples/sample-form.tsx`

- `onValid` type becomes `(value: CreateSample) => void | Promise<unknown>` (the `onSubmit` / `onPublish` / `onConfirm` callbacks in `SampleFormProps` and `SubmitMeta`).
- In the form `onSubmit`, replace the unconditional reset at line 411-414 with:

```ts
const isSaved = await Promise.resolve(meta.onValid?.(payload)).then(
  () => true,
  () => false,
);
if (isSaved) formApi.reset(toSampleDraft(parsed.data));
```

The mutation hooks already toast the failure (`use-update-sample.ts:53`, `use-create-sample.ts:30`), so the rejection only decides whether to reset.

- Render the guard once inside the `<form>`, next to the existing `form.Subscribe`:

```tsx
<form.Subscribe selector={(state) => state.isDefaultValue}>
  {(isDefaultValue) => (
    <UnsavedChangesGuard
      isDirty={
        !isReadOnly &&
        (!isDefaultValue ||
          (attachmentChanges !== undefined &&
            hasUnsavedAttachmentChanges(attachments, attachmentChanges)))
      }
    />
  )}
</form.Subscribe>
```

- `isDefaultValue` (deep compare against defaults) rather than `isDirty` (sticky once touched), so an edit that is undone no longer warns.
- `!isReadOnly`: a form held read-only by the lock or a stale rejection cannot be dirtied, and the stale message already tells the user to reload.

### 4. Routes: return the mutation promise, skip the blocker on post-save redirects

`admin/src/routes/samples.$sampleId.tsx`:

- Save: `onSubmit: (value) => updateSample.mutateAsync(value)`.
- Publish: `updateSample.mutateAsync(value).then(() => publishSample.mutate({ id, status }, { onSuccess: () => navigate({ to: listRoute }) }))`.
- Withdraw / tombstone items: `updateSample.mutateAsync(value).then(() => setStatus.mutate(...))`, tombstone keeps its nested `onSuccess` navigate.
- Delete: `navigate({ to: listRoute, ignoreBlocker: true })` (a confirmed delete must not re-prompt a dirty form).

`admin/src/routes/samples.create.tsx`:

- Save: `createSample.mutateAsync(value).then((sample) => navigate({ to: "/samples/$sampleId", params, search: { tab }, ignoreBlocker: true }))`. This navigate runs in the same microtask chain as the resolve, before the form resets, hence `ignoreBlocker`.
- Publish: `createSample.mutateAsync(value).then((sample) => publishSample.mutate(...))`, unchanged callbacks inside; the second round trip lands after the reset.

Edit lock: the in-app block keeps the page mounted, so the lock's unmount `DELETE` only fires after the user confirms. A cancelled `beforeunload` never fires `pagehide`, so the lock is kept. No change to `use-sample-edit-lock.ts`.

### 5. i18n: `packages/admin/messages/en.json`

`unsaved_changes_title` ("Unsaved changes"), `unsaved_changes_description` ("Your changes will be lost if you leave this page."), `unsaved_changes_leave` ("Leave without saving"). Cancel keeps `action_cancel`.

### 6. Test harness: `admin/test/render.tsx`

`sample-form.spec.tsx` renders `SampleForm` without a router, and `useBlocker` calls `useRouter`. Wrap `render` in `RouterContextProvider` with `createRouter({ routeTree: createRootRoute(), history: createMemoryHistory() })`. Additive for every other spec using the helper.

## Tests (TDD, one per rule)

`admin/src/samples/edit-sample-page.spec.tsx` (reuse `renderEditPage`, model on the "edit lock" describe at 1367):

- should ask before leaving with unsaved changes: edit the name, click Cancel, expect the dialog; confirm "Leave without saving", expect the list heading and the lock `DELETE`.
- should stay on the form when the leave is cancelled: same, click Cancel in the dialog, name field still holds the edit, no navigation.
- should not ask when switching tabs with unsaved changes.
- should not ask when leaving an untouched sample after visiting every tab (guards against a control normalising its value on mount).
- should not ask after a successful save.
- should ask after a failed save (MSW 500 on PUT): the predicate is "unsaved", not "unsubmitted".
- should ask before leaving with a staged attachment (covers `hasUnsavedAttachmentChanges`; pending is enough, the three branches are one rule).

`admin/src/samples/create-sample-page.spec.tsx`: the existing redirect-after-create test (376-392) must stay green; it covers the `ignoreBlocker` on the create redirect.

`beforeunload` is browser-native and untestable in Vitest browser mode; the library owns it.

## Verification

- `pnpm test --project @projet-igsn/admin`, then `pnpm lint:check` and `pnpm fmt:check`.
- Manual in `make dev`: edit a sample, change a field, click a sidebar link (dialog), reload the page (native prompt), switch tabs (no prompt), save then leave (no prompt), kill the api and save then leave (prompt).
- `make test-e2e` once at the end, per testing.md.
- Last commit of the implementation: `git rm plan-unsaved-change-warning.md`.

Skipped: warning while a save is still in flight (the mutation completes after unmount), prompting when the user types during a pending publish redirect, a French catalog (admin is English only).
