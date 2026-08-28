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

- Validate all external data (user input, file content, request bodies) at the trust boundary, which is `api`.
- Never re-validate an `api` response in `frontend`/`admin`: the api owns that schema, and a second parse turns drift into a crash instead of a blank field.
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
- `console.log` in production code: use a logging library, the apps' react-query `onError` `console.error` being the one browser-side exception.
- Hidden side effects: return every change (a `Promise` if async).
- Code testable only through mocks: the logic is too coupled to its I/O.

## Comments

A comment ships only from the `cleanup-comments` keep table, and every other comment is a defect the `code-quality-reviewer` blocks on.

- A changeset adds zero comments.
- The four that ship: a business rule the code cannot state, a `ponytail:` marker, a temporary TODO or out-of-scope note, a tool directive.
- A TODO ships only as temporary, naming the work that deletes it, never as documentation nobody will remove.
- Everything else goes, a non-obvious why, a library quirk, a workaround's cause and a warning against a future mistake included.
- One or two lines, for a human, never narration, never the what or the how.
- Prefer a clear name or a smaller function to a comment explaining an unclear one.
- Never restate the code, describe past implementations, leave commented-out code, add section banners, or JSDoc a self-evident signature.
- Doubt deletes, "might help someone later" being no standing and "someone will break this" being a test to write.

```
// Wrong
// loop over the samples and keep the published ones
const published = samples.filter((s) => s.publishedAt !== null)

// Correct
// age_min_a is generated, so a NULL means the sample has no age at all
.where('age_min_a', 'is not', null)
```
