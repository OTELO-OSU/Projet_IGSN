---
paths:
  - "**/api/**/*.ts"
---

# Backend

Conventions for the `api` package.

## Database access

Use [Kysely](https://kysely.dev/) as the DBAL, a type-safe SQL query builder rather than an ORM (ADR [0001](../../docs/adr/0001-kysely-as-backend-dbal.md)).

- Repository implementations (`api/<entity>/repository.ts`) write Kysely queries, never raw SQL strings or ORM entities.
- Keep the Kysely schema types in sync with the database.
- Test real repositories against a real database, never a stubbed query builder.

## One query over app-side assembly

- Never fetch rows only to join, merge, aggregate, or count them in JS: that adds round-trips and re-implements the database.
- Use joins, aggregates, and the Kysely json helpers (`jsonObjectFrom`, `jsonArrayFrom`) so related data arrives with the main row (see `sample/service/sample-links.ts`).
- Keep a follow-up query as a last resort, for what SQL cannot express.

## Transactions

- Run every repository operation in a transaction via the `withTransaction` helper (`api/src/transaction.ts`), which reuses the transaction in progress when the handle already is one.
- Never nest a real transaction: the postgres driver has no savepoints.
- Have repository methods delegate to reusable functions taking the db or transaction (`Transactional<DB>`) as their first parameter, so they compose inside a caller's transaction and are tested directly.

## Identifiers

Generate primary-key UUIDs in the app with `uuid` v7 (`import { v7 as uuidv7 } from "uuid"`), never a database default.

- v7 is time-ordered, so ids sort by creation.
- Migrations add no `defaultTo(gen_random_uuid())`.
- Type the id `string`, not `Generated<string>`, in `db.ts`.

## Migrations

- One migration per file in `packages/api/migrations/`.
- Name files `YYYYMMDDhhmmss-kebab-title.ts` with a UTC timestamp prefix (`date -u +%Y%m%d%H%M%S`) so `FileMigrationProvider` applies them in creation order.
- Each file exports async `up(db)` and `down(db)`.
- Keep the Kysely `DB` types in `src/db.ts` in sync with the schema the migration creates.
- Run migrations with `pnpm -F @projet-igsn/api migrate`.
