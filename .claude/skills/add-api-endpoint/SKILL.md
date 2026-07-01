---
name: add-api-endpoint
description: Use when adding or extending an API endpoint in packages/api (a new route, repository, or domain entity). Enforces the folder-per-domain layout, the @projet-igsn/domain Zod entities, and TDD.
---

# Add an API endpoint

The `api` package is the trust boundary (backend-security rule) and holds the
**implementations**: it implements the service/repository interfaces declared in
`@projet-igsn/domain` and maps them to the database (architecture rule). Entity
models and interfaces live once in `domain`, shared with `admin`. Both packages
are organised **one folder per entity**.

Follow TDD (testing rule).

## Layout

For an `<entity>` (e.g. `sample`):

```
packages/domain/src/<entity>/model.ts            # Zod schema + inferred type (shared)
packages/domain/src/<entity>/model.spec.ts
packages/domain/src/<entity>/repository.ts       # repository/service interface (shared)
packages/api/src/<entity>/repository.ts          # implements the domain interface, persistence only
packages/api/src/<entity>/repository.spec.ts
packages/api/src/<entity>/routes.ts              # Hono sub-app
packages/api/src/<entity>/routes.spec.ts
```

`domain` holds the models and interfaces; `api` holds the implementations and
routes. Each entity is a folder in both.

## Workflow

1. **Entity (domain package).** If the entity or a field is new, define/extend its
   Zod schema first using the `add-domain-entity` skill. The endpoint depends on
   that schema existing.

2. **Add the workspace dep once.** If `packages/api/package.json` does not yet
   depend on the domain package, add `"@projet-igsn/domain": "workspace:*"` and run
   `pnpm install`.

3. **Repository (TDD).** The interface belongs in `domain`
   (`<entity>/repository.ts`, add-domain-entity skill). In `api`, write
   `<entity>/repository.spec.ts` describing the data operations, then the minimal
   `<entity>/repository.ts` that implements the domain interface and imports the
   model from its subpath (`@projet-igsn/domain/<entity>/model`). Persistence only,
   no HTTP.

4. **Route (TDD).** Write `<entity>/routes.spec.ts` exercising a Hono sub-app via
   `testClient` from `hono/testing` (see `packages/api/src/app.spec.ts`). Then the
   minimal `<entity>/routes.ts`: a `new Hono()` chain that validates every payload
   (body, query, params) with the domain schema before business logic
   (backend-security rule).

5. **Mount.** Add the sub-app to the root chain in `packages/api/src/app.ts`
   (`.route("/<entity>", <entity>Routes)`). Keep `app.spec.ts` green.

6. **Refactor** as it grows (coding-style rule).

## Verification gate

- `pnpm test packages/domain` and `pnpm test packages/api` both green.
- The route is reachable: start `pnpm --filter @projet-igsn/api dev` and confirm
  it responds on http://localhost:3002, or assert it through `testClient` in the
  routes spec.
- Invalid payloads are rejected by the schema, not just the happy path.

Not done until the tests pass and you have seen the output.
