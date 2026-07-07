# SampleForm primary/secondary action API

## Goal

Give `SampleForm` a single, generic footer API: a required `primaryAction` and
an optional `secondaryAction`, plus the always-present Cancel. This replaces the
current ad-hoc props (`submitLabel`, `onSubmit`, `onPublish`, `igsn`,
`published`) and their internal branching.

Two user requirements drive it:

1. The publish button is disabled when publishing is not possible (already
   implemented via `samplePublishBlockers`; preserved unchanged).
2. The create form shows a primary "Create" button (no secondary, no publish).

## Action model

```ts
type SampleFormAction =
  | { kind: "submit"; label: string; onSubmit: (value: CreateSample) => void }
  | { kind: "publish"; label: string; onPublish: (value: CreateSample) => void }
  | { kind: "link"; label: string; href: string };

type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: CreateSample;
  primaryAction: SampleFormAction;
  secondaryAction?: SampleFormAction;
};
```

Three kinds cover every existing footer button:

- `submit`: a plain form submit (create, save draft, save/publish updates).
  Rendered with the existing `SubmitButton`.
- `publish`: save-then-publish. Rendered with the existing `PublishSampleButton`
  (confirmation dialog), disabled with a tooltip listing `samplePublishBlockers`
  reasons when the current material would block publishing. Logic unchanged from
  today.
- `link`: navigate to the public page. Rendered as `Button asChild` wrapping an
  anchor.

## Footer layout

`Cancel (ghost) → secondaryAction (outline) → primaryAction (default variant)`.
`isPending` disables the submit/publish buttons as today.

## Submit routing

The TanStack form has one `onSubmit`; the fired action's callback is carried in
`onSubmitMeta`:

- form `onSubmit` parses the value with `createSampleSchema`, and on success
  calls `meta.onValid(parsed.data)`.
- The secondary/primary submit button calls `form.handleSubmit({ onValid: action.onSubmit })`.
- The publish button calls `form.handleSubmit({ onValid: action.onPublish })`.
- Default `onSubmitMeta` (Enter key) routes to whichever of primary/secondary is
  a `submit` action, preferring primary. Enter never triggers `publish` (that
  needs explicit confirmation) or `link`. This keeps today's behavior: Enter
  saves, never publishes.

## Callers

- **create** (`samples.create.tsx`): `primaryAction = { kind: "submit", label: m.action_create(), onSubmit }`. No secondary. Result: Cancel + Create (primary).
- **edit, draft** (`samples.$sampleId.tsx`, not published):
  - `secondaryAction = { kind: "submit", label: m.action_save_draft(), onSubmit: updateSample }`
  - `primaryAction = { kind: "publish", label: m.action_save_publish(), onPublish: updateThenPublish }`
- **edit, published**:
  - `secondaryAction = { kind: "submit", label: m.action_publish_updates(), onSubmit: updateSample }`
  - `primaryAction = { kind: "link", label: m.action_view_public_page(), href: `${FRONTEND_URL}/samples/${igsn}` }`

## Testing

`sample-form.spec.tsx` moves to the new prop shape (build actions instead of
`submitLabel`/`onSubmit`/`onPublish`). Behavior coverage is preserved:

- name validation blocks submit
- submit calls the action's `onSubmit` with the parsed value (type/material variants)
- Cancel calls `onCancel`
- publish action calls its `onPublish`, not the submit `onSubmit`
- publish disabled + tooltip when material missing
- new: a `link` primary renders as an anchor to the public page

All message keys used already exist in `packages/admin/messages/en.json`.

## Out of scope

No change to `samplePublishBlockers`, the domain, or the API. Pure admin-side
refactor of the form footer.
