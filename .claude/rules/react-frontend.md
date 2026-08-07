---
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# React

## React Compiler

- This project uses the React Compiler, which memoizes automatically.
- Never add `useCallback`, `useMemo`, or `React.memo`.
- Reach for them only in the rare, measured case the compiler can't cover, with a comment saying why.

## Components

- Small function components, one responsibility each.
- Derive values during render instead of mirroring props/state into more state.
- Use `useEffect` only to sync with external systems (subscriptions, the DOM, non-React widgets), never to react to prop changes or fetch data.
- Give lists stable identity-based keys, never the array index.
- Ask only for the props a component uses, passing the specific fields rather than a whole object it barely reads.

## App shell

- Each app owns one shared shell in the root route: a `<header>` landmark and a `<main>` landmark wrapping the route `Outlet`.
- Keep `<main>` full-bleed (`w-full`) and let each page own its width wrapper (`mx-auto w-full max-w-6xl`), so a page can go edge-to-edge when its design needs it.
- Pages MUST NOT declare their own `<header>`/`<main>`: one of each landmark per document.

## State management

- Server state: @tanstack/react-query, the source of truth, never duplicated into client state.
- Client state: React Context with useState/useReducer.
- URL state: search params and route segments.
- Form state: @tanstack/react-form via `useAppForm` (see [forms.md](forms.md)).
- A value not submitted to the API is derivable: keep it in component state, re-derived from the form values on mount.
- Never reach for a global state manager; keep state local and lift to Context only when genuinely shared across distant components.

## Completeness gates publish, not the draft

- Optional sub-data (age) saves partially in a draft, with completeness enforced only at publish via `samplePublishBlockers`.
- The domain schema (`createSampleSchema`) keeps only data-validity invariants (value types, `min <= max`, whole numbers) and never requires a field just because a sibling is present.
- The form's `*` markers and hidden controls are a publish hint, not a draft error.

## Extract hooks

- When a component accumulates complex state logic (several related `useState`s, a `useReducer`, effects, derived values), extract it into a custom hook so the component reads as what it renders.

## URL as state

- Persist shareable state in the URL (filters, sort order, pagination, active tab, search query): if refreshing should restore it, it belongs in the URL.

## Component composition

- Container components own data loading and side effects.
- Presentational components receive props and render UI, staying pure.
- Use compound components (parent owns state, children consume via context) rather than prop drilling for complex widgets.

## Data fetching

- Fetch independent data in parallel, avoiding parent-child waterfalls.
- Use @tanstack/react-query for caching, optimistic updates, and revalidation rather than rolling your own.
- For optimistic updates, snapshot state, apply immediately, roll back on failure, and show visible error feedback on rollback.

## Consuming the API

Each entity gets one react-query hook per operation (`useSamples`, `useCreateSample`), which:

- calls `api` directly through the authed client from `useApiClient`
- builds the request from the domain types
- parses the response with the domain Zod schema at the boundary, never trusting the shape of network data

## Data tables

- Render datagrids with `@tanstack/react-table` (headless) plus the design-system shadcn `table` primitives.
- Let the library own table state (sorting, pagination, selection, column visibility).
- For server-paginated tables use manual pagination and keep page and page size in the URL.
