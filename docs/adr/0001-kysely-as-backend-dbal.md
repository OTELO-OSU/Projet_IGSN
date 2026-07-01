# 1. Kysely as the backend DBAL

## Status

Accepted

## Context

The `api` package implements the repositories declared in `domain`, mapping
them to the database. It needs a way to talk to the database. Options ranged
from raw SQL through a query builder to a full ORM.

## Decision

Use [Kysely](https://kysely.dev/) as the database abstraction layer in `api`.

It is a type-safe SQL query builder, not an ORM: it stays close to SQL, infers
types from a schema definition, and adds no runtime magic or hidden migrations.
This fits the repository pattern, where each `api/<entity>/repository.ts`
implements a `domain` interface with persistence only.

## Consequences

- Repository implementations write Kysely queries, not raw strings or ORM
  entities. The query builder catches column and type mistakes at compile time.
- Per the backend testing rule, real repositories are tested against a real
  database; a stubbed query builder is never a substitute.
- A schema/types definition for Kysely must be kept in sync with the database.
