---
paths:
  - "**/api/**/*.ts"
---

# Backend testing

Testing conventions for the `api` package.

## Test through the app, not the handler

Drive endpoints with Hono's `testClient(app)` so routing, validation, and
middleware run as in production. Never call a route handler function directly:
that skips the trust boundary you most need to cover.

    import { testClient } from "hono/testing";
    import app from "./app";

    it("should reject an invalid IGSN", async () => {
      const client = testClient(app);
      const res = await client.samples.$post({ json: { igsn: "nope" } });
      expect(res.status).toBe(400);
    });

## Assert status and body

Check the HTTP status and the response shape, not just one. A 200 with the
wrong body is still a bug.

## Cover the boundary cases

For each endpoint, test the happy path plus the failures the API must enforce:
schema rejection (400), unauthenticated (401), forbidden
role (403), missing resource (404). These are the regressions a frontend-only
test cannot catch.

## Integration tests, not mocks

Test against a real Postgres, never a mocked query builder or an in-memory fake
repository: a stubbed query never catches a broken one. Use
`@kysely-vitest/postgres`, which gives each test a Kysely client in a
transaction rolled back at the end, so tests share a database without leaking
state. See the `kysely-vitest-postgres` skill for examples.

## Isolation

No external services other than the test database. Each test owns the data it
creates; rely on the per-test transaction rollback for cleanup, never on rows
or state left by another test.
