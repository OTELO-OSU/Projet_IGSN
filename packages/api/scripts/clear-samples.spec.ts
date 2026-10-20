import { sql } from "kysely";
import { mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { publishSample } from "../src/sample/service/publish-sample.ts";
import { insertSampleBatch } from "../src/tests/insert-sample-batch.ts";
import { insertServiceAccount } from "../src/tests/insert-service-account.ts";
import { insertUser } from "../src/tests/insert-user.ts";
import { pgTest } from "../src/tests/pg-test.ts";
import { publishableSample } from "../src/tests/sample-fixtures.ts";
import { clearSamples, clearSamplesRefusal } from "./clear-samples.ts";

describe("clearSamplesRefusal", () => {
  it.each([
    { argv: [], host: undefined },
    { argv: ["--yes"], host: "https://api.datacite.org" },
    { argv: ["--yes"], host: "https://api.datacite.org/" },
  ])("should refuse $argv against DataCite host $host", ({ argv, host }) => {
    expect(clearSamplesRefusal(argv, host)).toBeDefined();
  });

  it.each([{ host: undefined }, { host: "https://api.test.datacite.org" }])(
    "should allow --yes against DataCite host $host",
    ({ host }) => {
      expect(clearSamplesRefusal(["--yes"], host)).toBeUndefined();
    },
  );
});

describe("clearSamples", () => {
  pgTest(
    "should delete every sample, its location, attachments and batch webhook, keep the user and restart the internal number",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "jean.martin-c4r@univ-lorraine.fr");
      const account = await insertServiceAccount(db, "Harvester", owner.id);
      const batch = await insertSampleBatch(
        db,
        account.id,
        owner.id,
        [{ partnerId: "p-1", create: publishableSample }],
        { url: "https://partner.example.org/hooks/igsn", secret: "secret" },
      );
      const sampleId = batch.items[0]!.id;
      await publishSample(db, sampleId);
      const storageDir = join(tmpdir(), crypto.randomUUID());
      await mkdir(join(storageDir, sampleId), { recursive: true });

      // Act
      const count = await clearSamples(db, storageDir);

      // Assert
      expect(count).toBe(1);
      expect(await db.selectFrom("sample").select("id").execute()).toEqual([]);
      expect(await db.selectFrom("location").select("id").execute()).toEqual(
        [],
      );
      expect(
        await db
          .selectFrom("sample_batch_webhook")
          .select("batch_id")
          .execute(),
      ).toEqual([]);
      expect(await db.selectFrom("user").select("id").execute()).toEqual([
        owner,
      ]);
      await expect(stat(join(storageDir, sampleId))).rejects.toThrow();
      const { rows } = await sql<{
        next: string;
      }>`select nextval('sample_internal_number_seq') as next`.execute(db);
      expect(rows[0]!.next).toBe("1");
    },
  );
});
