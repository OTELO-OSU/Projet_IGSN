---
paths:
  - "**/api/**/*.ts"
---

# Backend

Conventions for the `api` package.

## Database access

Use [Kysely](https://kysely.dev/) as the DBAL (ADR
[0001](../../docs/adr/0001-kysely-as-backend-dbal.md)). It is a type-safe SQL
query builder, not an ORM: close to SQL, types inferred from a schema, no
runtime magic or hidden migrations.

- Repository implementations (`api/<entity>/repository.ts`) write Kysely
  queries, not raw SQL strings or ORM entities.
- Keep the Kysely schema types in sync with the database.
- Test real repositories against a real database, never a stubbed query builder.

## Transactions

- Every repository operation runs in a transaction via the `withTransaction`
  helper (`api/src/transaction.ts`): it reuses the transaction in progress when
  the handle already is one, else opens a new one. The postgres driver has no
  savepoints, so never nest a real transaction.
- Repository methods delegate to reusable functions that take the db or
  transaction (`Transactional<DB>`) as their first parameter. They compose
  inside a caller's transaction and are tested directly, not only through the
  repository wiring.

## Identifiers

- Generate primary-key UUIDs in the app with `uuid` v7
  (`import { v7 as uuidv7 } from "uuid"`), not a database default. v7 is
  time-ordered, so ids sort by creation. Migrations add no
  `defaultTo(gen_random_uuid())`; the id is a required value on insert (type it
  `string`, not `Generated<string>`, in `db.ts`).

## Migrations

- One migration per file in `packages/api/migrations/`.
- Name files `YYYYMMDDhhmmss-kebab-title.ts`: a UTC timestamp prefix (from
  `date -u +%Y%m%d%H%M%S`) so `FileMigrationProvider` applies them in creation
  order, then a kebab-case description.
- Each file exports async `up(db)` and `down(db)`. Keep the Kysely `DB` types in
  `src/db.ts` in sync with the schema the migration creates.
- Run migrations with `pnpm -F @projet-igsn/api migrate`.
