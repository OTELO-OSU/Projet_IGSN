---
paths:
  - "**/api/**/*.ts"
---

# Backend testing

## Test through the app, not the handler

- Drive endpoints with Hono's `testClient(app)` so routing, validation and middleware run as in production.
- Assert status and body: a 200 with the wrong body is still a bug.

```ts
import { testClient } from "hono/testing";
import app from "./app";

it("should reject an invalid IGSN", async () => {
  const client = testClient(app);
  const res = await client.samples.$post({ json: { igsn: "nope" } });
  expect(res.status).toBe(400);
});
```

## Cover the boundary cases

Per endpoint, the happy path plus only the failures that endpoint enforces: schema rejection (400), unauthenticated (401), forbidden role (403), missing resource (404).

- A public route has no 401 or 403.
- These stay even under the per-rule budget in `testing.md`, being the trust boundary, and a reviewer never cuts them as duplicates.

## Integration tests, not mocks

- Use real Postgres, never a mocked query builder or a fake repository.
- `@kysely-vitest/postgres` gives each test a Kysely client in a transaction rolled back at the end (see the `kysely-vitest-postgres` skill).
- Use no external service other than the test database.
- Each test owns the data it creates and relies on that rollback, never on another test's rows.
