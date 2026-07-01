---
name: kysely-vitest-postgres
description: Use when writing integration tests for packages/api that hit Postgres through Kysely with @kysely-vitest/postgres. Covers the pgTest function and its per-test transaction-rollback db fixture. Reach for this instead of mocking or faking the database.
---

# Integration testing the API with @kysely-vitest/postgres

`api` tests run against a real Postgres, not a mock or fake (testing-backend
rule). The plugin starts Postgres; you never start one yourself. For the API
details (config, seeding via `SeedFunction`, types), read Context7
`/jonathanarnault/kysely-vitest`.

`pgTest` is a drop-in for vitest's `it`. The injected `db` is a transaction
rolled back after the test, so put data in the test and never clean up. Cover
success and failure (testing rule). Repositories take the Kysely instance as an
argument so the test passes the transactional `db`; for routes, inject that
same `db` into the Hono app.

    import { describe, expect } from "vitest";
    import { pgTest } from "../tests/pg-test.js";
    import { createSampleRepository } from "./repository.js";

    describe("sampleRepository", () => {
      pgTest("should read back a persisted sample", async ({ db }) => {
        const repo = createSampleRepository(db);
        await repo.create({ igsn: "IGSN123" });
        expect(await repo.findByIgsn("IGSN123")).toMatchObject({ igsn: "IGSN123" });
      });

      pgTest("should reject a duplicate IGSN", async ({ db }) => {
        const repo = createSampleRepository(db);
        await repo.create({ igsn: "IGSN123" });
        await expect(repo.create({ igsn: "IGSN123" })).rejects.toThrow();
      });
    });

## Seeding

Data shared across tests (reference rows, fixtures every test reads) goes in a
`SeedFunction<DB>` wired into the plugin; it runs once before the suite, inside
the migrated schema and outside the per-test transaction, so every test sees it.
Data a single test owns stays in that test.

    import type { SeedFunction } from "@kysely-vitest/postgres/types.js";
    import type { DB } from "../db.js";

    export const seed: SeedFunction<DB> = async (db) => {
      await db.insertInto("users").values([{ username: "alice" }]).execute();
    };

## Verification gate

`pnpm test packages/api` green. Each test passes in isolation and on re-run (no
leftover rows = rollback works), with both success and failure paths covered.
