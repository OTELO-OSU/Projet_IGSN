---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# Coding Style & TypeScript

## Core principles

- KISS: simplest solution that works. Clarity over cleverness.
- DRY: extract on real repetition, not speculation.
- YAGNI: don't build features before they're needed.
- DDD: model the domain explicitly (samples, sub-samples, IGSN, roles). Shared
  business logic and contracts live in `domain`, implementations in `api`;
  name types and functions after domain concepts.
- Functional: prefer pure functions, composition, and `map`/`filter`/`reduce`.
- Composition over inheritance: compose small functions and types; no class
  hierarchies.

## Immutability

Create new objects, never mutate existing ones.

## File organization

- Many small files over few large ones: 200-400 lines typical, 800 max.
- High cohesion, low coupling. Organize by feature/domain, not by type.
- When an edit would push a file past ~400 lines, extract a module instead of
  appending.
- No barrel files: never create `index.ts`/`index.js` that only re-export from
  sibling modules. Import directly from the file that defines the symbol.

## Naming

- Variables, functions, hooks: camelCase (hooks prefixed `use`)
- Booleans: `is`/`has`/`should`/`can` prefix
- Types, components: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case, including component files, to match shadcn UI style
  (`user-card.tsx`, not `UserCard.tsx`)

## Types

Always use `type`, never `interface`. Never use TypeScript `enum`: define the
set with a Zod enum schema and infer the type with `z.infer`. Add explicit
parameter and return types to exported functions; let TypeScript infer obvious
local types.

    type User = {
      id: string
      email: string
    }

    const userRoleSchema = z.enum(['admin', 'member'])
    type UserRole = z.infer<typeof userRoleSchema>

Prefer a Zod schema with `z.infer<typeof schema>` when runtime validation is
useful (one source of truth). Use plain `type` for internal shapes, generics,
and prop types.

Prefer composition over inheritance: compose types with intersections (`&`) and
build behavior from small functions, not class hierarchies.

## Avoid any

Never use `any` in application code. Use `unknown` for untrusted input, then
narrow. Use generics when a value's type depends on the caller.

    // Wrong
    function getErrorMessage(error: any) {
      return error.message
    }

    // Correct
    function getErrorMessage(error: unknown): string {
      if (error instanceof Error) return error.message
      return 'Unexpected error'
    }

## React props

Define props with a named `type`. Type callback props explicitly. Don't use
`React.FC` without a specific reason.

    type UserCardProps = {
      user: User
      onSelect: (id: string) => void
    }

    function UserCard({ user, onSelect }: UserCardProps) {
      return <button onClick={() => onSelect(user.id)}>{user.email}</button>
    }

## Input validation with Zod

Validate all external data (user input, API responses, file content) at the
boundary. Infer types from the schema and fail fast with clear errors.

    import { z } from 'zod'

    const userSchema = z.object({
      email: z.string().email(),
      age: z.number().int().min(0).max(150)
    })

    type UserInput = z.infer<typeof userSchema>
    const validated: UserInput = userSchema.parse(input)

## Error handling

Never silently swallow errors. Use async/await with try-catch and narrow
`unknown` errors before accessing properties. User-facing code: friendly
messages. Server-side: log detailed context.

    async function loadUser(userId: string): Promise<User> {
      try {
        return await riskyOperation(userId)
      } catch (error: unknown) {
        logger.error('Operation failed', error)
        throw new Error(getErrorMessage(error))
      }
    }

## Code smells to avoid

- Deep nesting (>4 levels): use early returns
- Magic numbers: use named constants
- Long functions (>50 lines): split into focused pieces
- Large files (>800 lines): extract modules
- `console.log` in production code: use a logging library

## Comments

Add a comment only when the code is hard to understand on its own: explain the
why (intent, trade-off, edge case), not the what. Don't restate what the code
already says or leave commented-out code behind. Prefer a clear name over a
comment that explains an unclear one.
