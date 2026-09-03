---
type: practice
title: React and accessibility conventions
description: >-
  React Compiler means no manual memoization; react-query owns server state, the
  URL owns shareable state, and the target is WCAG 2.1 AA.
resource: .claude/rules/react-frontend.md
tags:
  - frontend
  - react
  - accessibility
  - practice
relations:
  - type: depends_on
    target: form-kit-and-hidden-values
  - type: depends_on
    target: file-layout-conventions
  - type: depends_on
    target: publish-blockers
status: stable
---

**React Compiler** memoizes automatically, so never add `useCallback`, `useMemo` or `React.memo`; reach for them only in a rare measured case, with a comment saying why.

**Components**: small function components with one responsibility. Derive values during render instead of mirroring props or state into more state. `useEffect` only to sync with external systems, never to react to prop changes or fetch data. Stable identity-based list keys, never the index. Ask only for the props a component uses. Extract a custom hook when a component accumulates state logic, so it reads as what it renders. Containers own data loading, presentational components stay pure, and compound components beat prop drilling.

**State ownership**: server state is `@tanstack/react-query` and is never duplicated into client state; client state is React Context with `useState`/`useReducer`; shareable state (filters, sort, pagination, active tab, search query) lives in the URL, so refreshing restores it; form state is `useAppForm` ([[form-kit-and-hidden-values]]). A value not submitted to the API is derivable, kept in component state and re-derived from the form values on mount. Never a global state manager.

**Consuming the api**: one react-query hook per operation, calling the authed client from `useApiClient`, building the request from the domain types and parsing the response with the domain Zod schema at the boundary ([[file-layout-conventions]]). Fetch independent data in parallel; for optimistic updates snapshot, apply, roll back on failure with visible feedback.

**App shell**: each app owns one shared shell in the root route, a `<header>` and a `<main>` landmark wrapping the route `Outlet`. `<main>` stays full-bleed and each page owns its width wrapper. Pages MUST NOT declare their own `<header>` or `<main>`.

**Data tables**: `@tanstack/react-table` headless plus the design-system shadcn `table` primitives, the library owning table state; server-paginated tables use manual pagination with page and page size in the URL ([[kysely-dbal]]).

**Accessibility, WCAG 2.1 AA**, the researcher persona being change-averse and an inaccessible UI one more reason not to adopt: the native element for the job and never a `div` rebuild; ARIA only when no native element fits, smallest addition first, never overriding a native role; everything mouse-operable works by keyboard with visible focus, no keyboard trap and no `tabindex` above 0; every input has an associated label, required marked in text not colour alone, errors tied with `aria-describedby`; `alt` on every image, an accessible name on every icon-only button; contrast 4.5:1 for normal text and 3:1 for large text and controls; one `h1` per page with no skipped levels.

**Completeness gates publish, not the draft**: optional sub-data saves partially, `createSampleSchema` keeping only data-validity invariants and never requiring a field just because a sibling is present, so the `*` markers are a publish hint rather than a draft error ([[publish-blockers]]).
