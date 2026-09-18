import { superAdminScope } from "@projet-igsn/domain/user/moderation-scope";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { draft } from "../../tests/sample-fixtures.ts";
import { insertSample } from "./insert-sample.ts";
import {
  listModeratedSamples,
  listPublishedSamples,
  listPublishedSamplesForService,
} from "./list-sample.ts";
import { publishSample } from "./publish-sample.ts";

async function publishParentAndSubSample(db: Transactional<DB>) {
  const parent = await insertSample(db, { ...draft, name: "Parent" });
  await publishSample(db, parent.id);
  const child = await insertSample(db, {
    ...draft,
    name: "Sub-sample",
    parentIds: [parent.id],
  });
  await publishSample(db, child.id);
}

describe("sub-sample filtering", () => {
  pgTest.for([
    ["absent", undefined, ["Parent"]],
    ["false", false, ["Parent"]],
    ["true", true, ["Parent", "Sub-sample"]],
  ] as const)(
    "should list publicly only the root samples when includeSubSamples is %s",
    async ([, includeSubSamples, expected], { db }) => {
      // Arrange
      await publishParentAndSubSample(db);

      // Act
      const { data, total } = await listPublishedSamples(db, {
        page: 1,
        perPage: 10,
        includeSubSamples,
      });

      // Assert
      expect(data.map((sample) => sample.name).sort()).toEqual(expected);
      expect(total).toBe(expected.length);
    },
  );

  pgTest(
    "should keep sub-samples in the moderated list whatever includeSubSamples says",
    async ({ db }) => {
      // Arrange
      await publishParentAndSubSample(db);

      // Act
      const { data } = await listModeratedSamples(
        db,
        { page: 1, perPage: 10, includeSubSamples: false },
        superAdminScope(crypto.randomUUID()),
      );

      // Assert
      expect(data.map((sample) => sample.name).sort()).toEqual([
        "Parent",
        "Sub-sample",
      ]);
    },
  );

  pgTest("should keep sub-samples in the service list", async ({ db }) => {
    // Arrange
    await publishParentAndSubSample(db);

    // Act
    const { data } = await listPublishedSamplesForService(
      db,
      { page: 1, perPage: 10 },
      superAdminScope(crypto.randomUUID()),
      false,
    );

    // Assert
    expect(data.map((sample) => sample.name).sort()).toEqual([
      "Parent",
      "Sub-sample",
    ]);
  });
});
