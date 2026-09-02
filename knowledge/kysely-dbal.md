---
type: persistence
title: Kysely as the backend DBAL
description: >-
  api persistence is Kysely, a type-safe SQL query builder and not an ORM,
  tested against a real Postgres.
resource: packages/api/src/db.ts
tags:
  - persistence
  - api
  - testing
relations:
  - type: depends_on
    target: package-layering
  - type: depends_on
    target: testing-strategy
status: stable
---

Kysely is the database abstraction layer in `api`: a type-safe SQL query builder, not an ORM, so it stays close to SQL, infers types from a schema definition, and adds no runtime magic or hidden migrations.

- Each `api/<entity>/repository.ts` implements a `domain` interface with persistence only ([[package-layering]]).
- Repositories write Kysely queries, never raw strings or ORM entities, so the builder catches column and type mistakes at compile time.
- The Kysely schema types in `db.ts` must be kept in sync with the database by hand; migrations live in `packages/api/migrations/` and run with `pnpm -F @projet-igsn/api migrate`.
- Types Postgres has no Kysely equivalent for are declared as `string` and validated by Zod at the boundary: `material` (ltree), `geom` (`Generated<string>`, never selected).
- Spatial and trigram predicates use `sql` fragments.
- Real repositories are tested against a real Postgres through `@kysely-vitest/postgres` (`pgTest`, a per-test transaction-rollback `db` fixture); a stubbed query builder is never a substitute. The container image is `postgis/postgis:17-3.5`, needed for [[sample-location]].
- Lists are paginated server-side, so sorting and filtering MUST happen in the Postgres query (`orderBy` / `where`), never in the client or on a fetched page; the params are declared in the list query schema in `domain` and kept in the URL app-side.
