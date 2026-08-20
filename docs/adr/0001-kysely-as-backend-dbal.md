# 0001. Kysely as the backend DBAL

## Status

Accepted

## Context

`api` implements the repositories declared in `domain`, mapping them to the database. Options ranged from raw SQL through a query builder to a full ORM.

## Decision

Use [Kysely](https://kysely.dev/) as the database abstraction layer in `api`: a type-safe SQL query builder, not an ORM, so it stays close to SQL, infers types from a schema definition, and adds no runtime magic or hidden migrations. This fits the repository pattern, where each `api/<entity>/repository.ts` implements a `domain` interface with persistence only.

## Consequences

- Repositories write Kysely queries, not raw strings or ORM entities, so the builder catches column and type mistakes at compile time.
- Real repositories are tested against a real database; a stubbed query builder is never a substitute.
- The Kysely schema types must be kept in sync with the database.
