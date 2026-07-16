---
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# React

## React Compiler

This project uses the React Compiler; it memoizes automatically. Don't add
`useCallback`, `useMemo`, or `React.memo`. Reach for them only in the rare,
measured case the compiler can't cover (leave a comment why).

## Components

- Small function components, one responsibility each.
- Derive values during render instead of mirroring props/state into more state.
- `useEffect` is for syncing with external systems (subscriptions, the DOM,
  non-React widgets), not for reacting to prop changes or fetching data. Use
  @tanstack/react-query for data.
- Lists need stable identity-based keys, never the array index.
- Ask only for the props a component uses. Pass the specific fields it needs
  (e.g. `title` and `description`), not a whole object it barely reads.

## App shell

Each app owns one shared shell in the root route: a `<header>` landmark and a
`<main>` landmark wrapping the route `Outlet`. Keep `<main>` full-bleed
(`w-full`); each page owns its own width wrapper (`mx-auto w-full max-w-6xl`),
so a page can also go edge-to-edge (a full-bleed hero) when its design needs it.
Pages render inside `<main>` and MUST NOT declare their own `<header>`/`<main>`;
one of each landmark per document.

## State management

Treat each concern separately:

- Server state: @tanstack/react-query (the source of truth; don't duplicate it
  into client state)
- Client state: React Context (+ useState/useReducer)
- URL state: search params, route segments
- Form state: @tanstack/react-form (validate with zod schemas). Build reusable
  typed forms with `createFormHook`/`useAppForm` (see
  `@projet-igsn/design-system/components/form/app-form`)
  so fields and submit share one accessible markup and error pattern.
  Is the value submitted to the API? No → the value is derivable; keep
  component state, re-derived from the form values on mount.

Don't reach for a global state manager. Keep state local; lift to Context only
when genuinely shared across distant components.

## Forms

Build every form with `useAppForm` from
`@projet-igsn/design-system/components/form/app-form`, not raw
`@tanstack/react-form`. It yields fields and actions pre-bound to the shared,
accessible form inputs; pass per-form `defaultValues` and `validators` (a zod
schema from `domain`).

Reuse the existing bound inputs (`TextField`, `SubmitButton`...) via
`form.AppField` / `form.AppForm`. Need an input the kit doesn't have yet? Add it
to `packages/design-system/src/components/form/` and register it in `app-form.tsx`
so every form gets it, never inline a one-off input in an app.

Required means required to publish, not to save a draft: a field whose absence
blocks publication carries a trailing "\*" in its label, in text, never color
alone. A conditional requirement adds the marker the moment it starts to hold
and drops it when it stops (`withRequired`).

Is a field meaningless until a sibling is filled (a unit without its value)?
Disable it until the sibling is set, mark it required once enabled, and have
the schema reject its value while the sibling is missing.

Values hidden by UI state (a field for the other branch of a toggle, a tab
hidden by another value) follow three rules (ADR 0015):

1. While editing, keep them: hiding a field never clears its value, so
   switching back restores what the user entered. Values live in the form
   store, not in component state that unmounts.
2. On save, drop them: the compose step excludes values hidden behind the
   current UI state before validation, so a hidden value is never submitted
   and never raises a schema error the user cannot see or fix.
3. After a successful save, clear them: reset the form to the draft rebuilt
   from the submitted value, so dropped leftovers do not look saved. Visible
   fields are unaffected.

Every rule that hides a field needs its matching exclusion in the compose
step; a hidden field without one turns save into a silent noop.

## Extract hooks

When a component accumulates complex state logic (several related `useState`s,
a `useReducer`, effects, derived values), extract it into a custom hook. The
component reads as what it renders; the hook holds how the state works. Easier
to read, test, and reuse.

## URL as state

Persist shareable state in the URL: filters, sort order, pagination, active tab,
search query. If refreshing should restore it, it belongs in the URL.

## Component composition

- Container components own data loading and side effects.
- Presentational components receive props and render UI; keep them pure.
- Use compound components when related UI shares state (parent owns state,
  children consume via context). Prefer this over prop drilling for complex
  widgets.

## Data fetching

Fetch independent data in parallel; avoid parent-child waterfalls. Use
@tanstack/react-query for caching, optimistic updates, and revalidation rather
than rolling your own.

For optimistic updates: snapshot state, apply immediately, roll back on failure,
and show visible error feedback on rollback.

## API response format

Parse every API response with a Zod schema at the boundary; never trust the
shape of network data. Infer types from the schema rather than hand-writing
them.

    const apiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
      z.object({
        success: z.boolean(),
        data: data.optional(),
        error: z.string().optional(),
        meta: z
          .object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
          })
          .optional(),
      })

    const userResponse = apiResponseSchema(userSchema).parse(await res.json())

## Consuming the API

Each entity gets one react-query hook per operation (`useSamples`,
`useCreateSample`). The hook calls `api` directly through the authed client from
`useApiClient`, builds the request from the domain types, and parses the
response with the domain Zod schema at the boundary.

## Data tables

Render datagrids with `@tanstack/react-table` (headless) plus the design-system
shadcn `table` primitives. Let the library own table state (sorting, pagination,
selection, column visibility); do not hand-roll it. For server-paginated tables
use manual pagination and keep page and page size in the URL (see URL as state).
