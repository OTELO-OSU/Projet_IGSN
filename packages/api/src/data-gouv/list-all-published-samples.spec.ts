import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { sampleStatusSchema } from "@projet-igsn/domain/sample/sample";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createSampleRepository } from "../sample/repository.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { listAllPublishedSamples } from "./list-all-published-samples.ts";

const namesOf = async (db: Kysely<DB>, perPage?: number) =>
  (
    await listAllPublishedSamples(
      createSampleRepository(db, "attachments"),
      perPage,
    )
  )
    .map(({ name }) => name)
    .sort();

async function insertPublished(
  db: Kysely<DB>,
  name: string,
  overrides: Partial<CreateSample> = {},
): Promise<Sample> {
  const created = await insertSample(db, {
    ...publishableSample,
    name,
    ...overrides,
  });
  return (await publishSample(db, created.id))!;
}

describe("listAllPublishedSamples", () => {
  pgTest.for(sampleStatusSchema.options)(
    "should export a %s sample only when published",
    async (status, { db }) => {
      const owner = await insertUser(db, "owner@example.com");
      await insertParent(db, owner.id, status, "Subject");

      expect(await namesOf(db)).toEqual(
        status === "published" ? ["Subject"] : [],
      );
    },
  );

  pgTest(
    "should export sub-samples, minerals and synthetic samples, across pages",
    async ({ db }) => {
      const parent = await insertPublished(db, "Parent");
      await insertPublished(db, "Sub-sample", { parentIds: [parent.id] });
      await insertPublished(db, "Mineral", {
        material: "rock_and_sediment.mineral",
      });
      await insertPublished(db, "Synthetic", {
        material: "rock_and_sediment.synthetic_rock_mineral",
      });

      expect(await namesOf(db, 3)).toEqual([
        "Mineral",
        "Parent",
        "Sub-sample",
        "Synthetic",
      ]);
    },
  );
});
