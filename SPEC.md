# Spec: Sample description

## Objective

Add a "sample description" block to samples: physical description data a
contributor records at declaration and readers see on the public sample page.

Fields (from the design schema):

- **Collection date**: a single date or a date range. Stored as a range
  `{ start, end }`, date only (no time). A single date is the degenerate range
  `start === end`; the form offers a single-date / range toggle.
- **Sample orientation**: yes / no (null until answered). When yes, an optional
  free-text explanation (why oriented, how, orientation measurement).
- **Open description**: optional free text (morphology, texture, alteration,
  interest).
- **Size**: length, width, thickness. Each is optional and carries its own
  value + unit (mm, cm, dm, m).
- **Mass**: optional value + unit (mg, g, kg).
- **Volume**: optional value + unit (mm3, cm3, dm3, m3, ml, l).

Rules:

- A unit is mandatory exactly when its value is set: modeled structurally as a
  nullish `{ value, unit }` object with both members required.
- Collection date is a **publish blocker** (like material/type): optional on
  drafts, required to publish. New code `collection_date_missing`.
- Orientation explanation is valid only when `oriented === true` (superRefine,
  like `navigationType` requires `position`).
- `start <= end` for the collection date range.
- All other fields optional; the whole `description` object is nullable on
  `Sample`.

## Tech stack

Existing monorepo stack, no new dependencies: Zod v4 (domain), Hono + Kysely +
Postgres (api), React + TanStack form/query + design-system app-form (admin),
TanStack Router (frontend), Paraglide i18n, Vitest.

## Design

Follow the `location` precedent (the last same-shaped feature), with flat
columns instead of a side table (plain scalars, no PostGIS):

- **domain** `sample/description/model.ts`: `descriptionSchema`
  (`Description`), plus unit enums in their own files
  (`size-unit.ts`, `mass-unit.ts`, `volume-unit.ts`, codes in
  `lower_snake_case`). Dates as `z.iso.date()` strings (YYYY-MM-DD).
  `sampleSchema` gains `description: descriptionSchema.nullable()`;
  `createSampleSchema` gains `description: descriptionSchema.nullish()`.
- **publish blocker**: add `collection_date_missing` to
  `publishBlockerSchema` and `samplePublishBlockers`; the admin
  `publish-blocker-label.ts` map fails to compile until translated.
- **api**: one migration adding nullable columns to `sample`
  (`collection_date_start`, `collection_date_end` as `date`, `oriented`
  boolean, `orientation_explanation`, `open_description` text,
  `length_value`/`length_unit`, `width_*`, `thickness_*`, `mass_*`,
  `volume_*`). Map in `to-sample.ts` (row -> nested `description`, null when
  every column is null) and in insert/update services.
- **admin**: `sample-description-fields.tsx` in `src/samples/`, wired into
  `sample-form.tsx` and `sample-draft-schema.ts`. Single-date/range toggle is
  form-local UI state; single date writes the same value to start and end.
  Date input uses native `<input type="date">`: add a `DateField` to
  `design-system/src/components/form/` and register it in `app-form.tsx`
  (never inline in the app).
- **frontend**: `description-view.tsx` rendered by `sample-view.tsx` on the
  public sample page.
- **i18n**: unit labels are domain enums, so keys live in
  `packages/domain/messages/{locale}.json` prefixed by enum
  (`size_unit_mm`, `mass_unit_kg`, `volume_unit_ml`...), coverage asserted at
  compile time. Form labels and view copy live in each app's catalog.

## Commands

- Test: `pnpm test` (single package: `pnpm test --project @projet-igsn/domain`)
- Lint / format: `pnpm lint:check`, `pnpm fmt:check` (`:apply` to fix)
- Dev stack: `make dev`
- E2E (mandatory before ending the session): `make test-e2e`

## Project structure (files touched)

    packages/domain/src/sample/description/model.ts        descriptionSchema + invariants
    packages/domain/src/sample/description/size-unit.ts    sizeUnitSchema
    packages/domain/src/sample/description/mass-unit.ts    massUnitSchema
    packages/domain/src/sample/description/volume-unit.ts  volumeUnitSchema
    packages/domain/src/sample/sample.ts                    add description field
    packages/domain/src/sample/publication/*               collection_date_missing
    packages/domain/messages/{en,fr}.json                   unit labels
    packages/api/migrations/XXXX-add-sample-description.ts  nullable columns
    packages/api/src/sample/service/{to,insert,update}-sample.ts
    packages/design-system/src/components/form/date-field.tsx + app-form.tsx
    packages/admin/src/samples/sample-description-fields.tsx (+ form, draft schema, blocker label)
    packages/frontend/src/domain/samples/description-view.tsx (+ sample-view)

## Code style

Per repo rules: Zod schema + `z.infer`, no `interface`/`enum`, kebab-case
files, one concern per file, explicit `.ts` extensions inside domain, no
barrels. Example shape:

    export const massUnitSchema = z.enum(["mg", "g", "kg"]);
    export type MassUnit = z.infer<typeof massUnitSchema>;

    const measuredSchema = <U extends z.ZodEnum>(unit: U) =>
      z.object({ value: z.number().positive(), unit });

## Testing strategy

TDD, Vitest, specs beside sources:

- domain: `description/model.spec.ts` (valid shapes, start > end rejected,
  explanation without oriented=true rejected, unit-with-value coupling),
  publish-blocker specs extended.
- api: service specs via `kysely-vitest-postgres` (description round-trip,
  null when unset), route specs extended.
- admin: browser-mode component specs for the new fields (toggle single/range,
  unit required once value set), draft-schema specs.
- frontend: description-view spec (renders values, hides empty block).
- `make test-e2e` before ending the session.

## Boundaries

- **Always**: run package tests before committing; keep shared logic in
  `domain`; validate at trust boundaries; translate every user-facing string.
- **Ask first**: any new dependency; deviating from the flat-columns storage
  choice; changing existing sample fields.
- **Never**: store labels instead of codes; put shadcn/form components in an
  app; client-side filtering/sorting of lists; remove failing tests.

## Success criteria

- A draft saves with no description; publishing without a collection date is
  blocked and the tooltip names the reason in both locales.
- A sample round-trips a full description (range date, orientation + text,
  sizes with per-dimension units, mass, volume) through api and DB.
- Single-date mode stores `start === end`; reopening the form with
  `start === end` shows single-date mode.
- Setting a size/mass/volume value without its unit fails validation; unit
  without value fails too.
- Public sample page shows the description block; nothing renders when null.
- `pnpm test`, `pnpm lint:check`, `make test-e2e` pass.

## Open questions

None; resolved in review: collection date gates publish only, orientation
explanation optional, scope includes the public frontend view.
