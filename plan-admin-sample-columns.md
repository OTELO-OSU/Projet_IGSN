# Admin sample list: fewer, pickable columns

## Context

The admin sample table ([sample-table.tsx](packages/admin/src/samples/sample-table.tsx)) has 10 fixed columns and scrolls horizontally, so the row actions are often off screen.
Goal: a narrow IGSN, no Nature column, a column picker like the front's card field picker (plus dates), a Published date, and a sticky "Actions" column on the right.

Decisions (from the user):

- Always shown, not togglable: IGSN, Name, Status, Actions.
- Shown by default: the front's always-shown card fields (Type, Material, Location, Collector).
- Opt-in: the front's optional card fields (Collection method, Research program, Chief scientist, Numeric age, Geological age), plus today's admin columns (Internal ID, Specific name, Owner, Last modified) and the new Published.
- The choice is saved per browser in `localStorage`, like the front's `use-card-fields.ts`.

## 1. Move the card field definitions to `domain` (shared logic rule)

Today [card-fields.ts](packages/frontend/src/domain/samples/card-fields.ts), [format-age.ts](packages/frontend/src/domain/samples/format-age.ts) and [ancestor-paths.ts](packages/frontend/src/domain/samples/ancestor-paths.ts) live in `frontend`, bound to its `m` and label helpers.

- New `packages/domain/src/sample/card-field/create-card-fields.ts`: `createCardFields(m: Messages, getLocale: () => string)`, following the `createSampleLabels(m)` pattern in [create-sample-labels.ts](packages/domain/src/sample/create-sample-labels.ts). It calls `createSampleLabels(m)` itself and returns today's exports (`PICKABLE_FIELDS`, `selectedCardFields`, `materialText`, `locationText`, `typeNatureText`, plus a `typeText` for the admin Type column) and `formatNumericAge` / `formatGeologicalAge`.
- Move `ancestor-paths.ts` to `domain/src/sample/path/ancestor-paths.ts`, and `CardSample` / `CardField` types alongside the factory.
- Move the message keys those use from `frontend/messages/en.json` to `domain/messages/en.json` (`card_field_*`, `sample_field_material`, `sample_field_collector_name`, `sample_field_collection_method`, `sample_field_numeric_age`, `sample_field_geological_age`, `sample_section_{sample,location,scientific_context,age}`, `facet_research_program_name`, `facet_chief_scientist`); both apps' inlang settings already load the domain catalog.
- Frontend keeps a thin `card-fields.ts` that does `export const {...} = createCardFields(m, getLocale)`, so its importers (`use-card-fields.ts`, `sample-list.tsx`, `withdrawn-sample-sections.tsx`, `breadcrumb-field-row.tsx`) stay unchanged but for `ancestorPaths`' path.
- Move the matching specs with the code.

## 2. Move the picker to `design-system`

- [card-field-picker.tsx](packages/frontend/src/domain/samples/card-field-picker.tsx) becomes `design-system/src/components/field-picker.tsx`, generic: props `fields: {key, label, section, locked}[]`, `selected`, `onSelectedChange`, `triggerLabel`, `legend`. Same popover, checkbox and two-column section markup.
- Frontend `search-results-view.tsx` passes `PICKABLE_FIELDS` and its two messages; its spec moves or stays as a frontend wrapper spec.

## 3. Admin table

In [sample-table.tsx](packages/admin/src/samples/sample-table.tsx):

- **IGSN**: `w-64` -> about `w-28`; cell wrapped in the existing `TruncatedCell` tooltip, text in `<span dir="rtl" className="block truncate text-left">` so the ellipsis lands at the start and the distinctive end stays visible (IGSNs are plain alphanumerics, no bidi reordering). Draft `null` IGSN renders nothing.
- **Nature**: delete the column, `natureLabel` import and the `column_nature` message if unused elsewhere.
- **New columns** from `createCardFields(m, getLocale)` in a new `admin/src/samples/card-fields.ts` (same thin re-export as the front): one `ColumnDef` per optional/default card field, `cell: field.get(row.original)`, wrapped in `TruncatedCell` + `truncate`.
- **Published**: `accessorKey: "publishedAt"`, `formatDate` when not null, new `column_published` message. `publishedAt` is already on `Sample` and mapped by `api/src/sample/service/to-sample.ts`; confirm the admin list route goes through it.
- **Actions**: header `m.column_actions()` ("Actions", new message); meta class `sticky right-0 bg-background` on header and cells, the shadcn `Table` wrapper already being `overflow-x-auto`. Move it last (it already is).
- **Visibility**: TanStack's native `state.columnVisibility` / `onColumnVisibilityChange` (already installed); locked columns get `enableHiding: false`. `DataTable` already renders `getVisibleCells()`; switch its header loop and empty-row `colSpan` to visible columns (`getVisibleLeafColumns`).
- **Picker**: `FieldPicker` rendered above the table in [sample-list-panel.tsx](packages/admin/src/samples/sample-list-panel.tsx), fed from the table's hideable columns with the card field `section`s (dates and admin columns under a "Sample" / "Record" section).
- **Persistence**: `admin/src/samples/use-sample-columns.ts`, a copy of the front's `use-card-fields.ts` shape (storage key `admin-sample-columns`, defaults = Type, Material, Location, Collector when nothing is stored, unknown keys dropped).

## 4. Tests and e2e

- `sample-table.spec.tsx`: IGSN tooltip shows the full value, no Nature header, Actions header present, default columns, toggling a column shows/hides its header, choice survives a remount (localStorage).
- `e2e/support/admin/sample-list.page.ts`: drop the Nature header check and `expectSampleRowWithNature` (update its callers), and adjust the "Specific Name" / "Last modified" header checks that are now opt-in.

## Verification

- `pnpm test --project @projet-igsn/domain`, `--project @projet-igsn/frontend`, `--project @projet-igsn/admin`.
- `pnpm lint:check --quiet`, `pnpm fmt:check`.
- `make dev`, then a Playwright (Chromium) screenshot of `/admin/samples` at 1280px: no horizontal scroll with defaults, Actions pinned right when opt-in columns are added, IGSN tooltip on hover; front `/search` card picker still works.
- `make test-e2e` once at the end.

## Open point

- The user asked to drop Nature, but the front's "Type / Nature" field joins both; the admin column shows Type only (`typeText`). Flag in the summary.
