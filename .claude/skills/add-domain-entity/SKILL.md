---
name: add-domain-entity
description: Use when adding or extending a domain entity, repository/service interface, or shared domain function in packages/domain, the source of truth shared by api and admin. Enforces the folder-per-entity model.ts/repository.ts layout, schema-as-single-source-of-truth, and TDD.
---

# Add a domain entity

`@projet-igsn/domain` is the single source of truth for the domain: **shared
business logic, Zod-schema models, and the service/repository interfaces** that
`api` implements (architecture rule). One folder per entity under `src/`, one
concern per file. Both `api` and `admin` import from here. No I/O, no DB, no HTTP.

Follow TDD (testing rule).

## Layout

```
packages/domain/src/<entity>/model.ts             # schema + z.infer type
packages/domain/src/<entity>/model.spec.ts        # domain rules
packages/domain/src/<entity>/repository.ts        # repository/service interface (api implements it)
packages/domain/src/<entity>/<model>-validator.ts # request validators shared by more than one package
packages/domain/src/<entity>/<function>.ts        # one shared function per file, named after it
```

- One folder per entity, kebab-case, a sub-entity nesting as its own folder (`sample/age/model.ts`).
- Shared logic that is neither a model nor a repository is one function per file named after it (`igsn/generate-igsn-suffix.ts`), never a catch-all `helper.ts`.
- No barrel/index: callers import the subpath directly (`import { igsnSchema } from "@projet-igsn/domain/igsn/model"`).

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
