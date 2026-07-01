---
name: add-domain-entity
description: Use when adding or extending a domain entity, repository/service interface, or shared domain helper in packages/domain, the source of truth shared by api and admin. Enforces flat -model.ts/-repository.ts/-helper.ts layout, schema-as-single-source-of-truth, and TDD.
---

# Add a domain entity

`@projet-igsn/domain` is the single source of truth for the domain: **shared
business logic, Zod-schema models, and the service/repository interfaces** that
`api` implements (architecture rule). Flat files under `src/`, no sub-folders.
Both `api` and `admin` import from here. No I/O, no DB, no HTTP lives here.

Follow TDD (testing rule).

## Layout

```
packages/domain/src/<entity>/model.ts        # schema + z.infer type
packages/domain/src/<entity>/model.spec.ts   # domain rules
packages/domain/src/<entity>/repository.ts   # repository/service interface (api implements it)
packages/domain/src/<entity>/helper.ts       # shared logic that is neither model nor repository
```

One folder per entity, kebab-case (`igsn/helper.ts`, `sub-sample/model.ts`). No
barrel/index: the package exposes every file directly via its `./*` export, so
callers import the subpath: `import { igsnSchema } from "@projet-igsn/domain/igsn/model"`.

## Workflow

1. **Spec first.** Create `<entity>/model.spec.ts`. Assert the schema via
   `<entity>Schema.safeParse(...).success` over valid AND invalid inputs, plus the
   canonical output of any transform (see `src/igsn/model.spec.ts`).

2. **Schema (minimum to pass).** Create `<entity>/model.ts`:
   - `export const <entity>Schema = z.object({ ... })` and
     `export type <Entity> = z.infer<typeof <entity>Schema>` (camelCase
     `xxxSchema` value, PascalCase type).
   - **Reuse, don't redefine.** Use `igsnSchema` from `../igsn/model` for any IGSN
     field; `<existing>Schema.extend({ ... })` to derive an entity from another.
   - String-literal sets: `const FOO = [...] as const` + `z.enum(FOO)`, exported
     so callers reuse it.
   - Use zod v4 top-level formats: `z.email()`, `z.uuid()`, `z.iso.datetime()`,
     not the deprecated `z.string().email()`.
   - Model the domain honestly: name fields after domain concepts; encode real
     invariants (required vs optional, min length, references).

3. **Stay on `zod`.** New deps need sign-off (dependencies rule).

## Verification gate

- `pnpm test packages/domain` green, including the new spec's valid AND invalid
  cases (a schema with no rejecting test proves nothing).
- `pnpm lint:check packages/domain` and `pnpm fmt:check packages/domain` clean.

The repository/service interface lives here too; its implementation and the
route are the `add-api-endpoint` skill's job.
Not done until the tests pass and you have seen the output.
