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

See [forms.md](forms.md).

### Completeness gates publish, not the draft

Optional sub-data (age) save partially in a draft; completeness is
enforced only at publish via `samplePublishBlockers`, never in the draft schema.
The domain schema (`createSampleSchema`) keeps only data-validity invariants
(value types, `min <= max`, whole numbers) and never requires a field just
because a sibling is present. The form still marks fields with a `*` and
disables controls until they are reachable, but that is a publish hint, not a
draft error: a researcher can record a partial value and complete it later.

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
