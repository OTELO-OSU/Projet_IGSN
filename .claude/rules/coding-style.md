---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# Coding Style & TypeScript

## Core principles

- KISS: ship the simplest solution that works, clarity over cleverness.
- DRY: extract on real repetition, not speculation.
- YAGNI: don't build features before they're needed.
- DDD: name types and functions after domain concepts (samples, sub-samples, IGSN, roles).
- Functional: if a caller can observe a call's effects anywhere but its return value, remove the side effect or return the change.
- Composition over inheritance: compose small functions and types, no class hierarchies.
- Least knowledge: a unit a caller cannot use from its signature alone, or that knows its callers, leaks a detail.
- Single responsibility: a part of a component or function carrying its own state, logic, or validation moves to its own file.
- Immutability: create new objects, never mutate existing ones.

## File organization

- Many small files over few large ones: 200-400 lines typical, 800 max.
- Organize by feature/domain, not by type.
- When an edit would push a file past ~400 lines, extract a module instead of appending.
- Never create a barrel `index.ts`/`index.js` that only re-exports siblings; import from the file that defines the symbol.

## Naming

- Variables, functions, hooks: camelCase (hooks prefixed `use`).
- Booleans: `is`/`has`/`should`/`can` prefix.
- Types, components: PascalCase.
- Constants: UPPER_SNAKE_CASE.
- Files: kebab-case, including component files (`user-card.tsx`, not `UserCard.tsx`).

## Types

- Always `type`, never `interface`.
- Never a TypeScript `enum`: define the set with a Zod enum schema and infer the type with `z.infer`.
- Put explicit parameter and return types on exported functions, and let TypeScript infer obvious local types.
- Use a Zod schema plus `z.infer` when runtime validation is useful, a plain `type` for internal shapes, generics, and props.
- Compose types with intersections (`&`), never class hierarchies.

## Avoid any

- Never `any` in application code.
- Use `unknown` for untrusted input, then narrow.
- Use generics when a value's type depends on the caller.

## Input validation with Zod

- Validate all external data (user input, API responses, file content) at the boundary.
- Infer types from the schema.
- Fail fast with clear errors.

## Error handling

- Never silently swallow an error.
- Use async/await with try-catch, narrowing `unknown` errors before accessing properties.
- Show friendly messages to users and log detailed context server-side.

## Code smells to avoid

- Deep nesting (>4 levels): use early returns.
- Magic numbers: use named constants.
- Long functions (>50 lines): split into focused pieces.
- Large files (>800 lines): extract modules.
- `console.log` in production code: use a logging library.
- Hidden side effects: return every change (a `Promise` if async).
- Code testable only through mocks: the logic is too coupled to its I/O.

## Comments

No comment is the rule, and a comment is the exception for code a reader cannot follow on its own.

- Write for a human, one or two lines, never narration.
- Carry what the code cannot (intent, trade-off, non-obvious edge case, why the obvious approach fails), never the what or the how.
- Prefer a clear name or a smaller function over a comment explaining an unclear one.
- Never restate the code, describe past implementations, leave commented-out code, add section banners, or JSDoc a self-evident signature.
- A `ponytail:` comment naming a deliberate shortcut and its ceiling is a keeper, since that intent lives nowhere else.

```
// Wrong
// loop over the samples and keep the published ones
const published = samples.filter((s) => s.publishedAt !== null)

// Correct
// age_min_a is generated, so a NULL means the sample has no age at all
.where('age_min_a', 'is not', null)
```
