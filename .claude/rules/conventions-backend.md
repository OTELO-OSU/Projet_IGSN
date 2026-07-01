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
