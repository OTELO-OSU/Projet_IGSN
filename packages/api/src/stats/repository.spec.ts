import { describe, expect } from "vitest";

import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { draft } from "../tests/sample-fixtures.ts";
import { createStatsRepository } from "./repository.ts";

describe("stats repository", () => {
  pgTest(
    "should count every declared sample but drafts, queued or not, and tombstones, sub-samples included",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@example.org");
      for (const status of [
        "draft",
        "pending",
        "failed",
        "published",
        "withdrawn",
        "tombstone",
      ] as const) {
        await insertParent(db, owner.id, status, status);
      }
      const parent = await insertParent(db, owner.id, "published", "parent");
      const child = await insertSample(db, {
        ...draft,
        parentIds: [parent.id],
      });
      await publishSample(db, child.id);
      // Act
      const stats = await createStatsRepository(db).count();
      // Assert
      expect(stats).toEqual({ samples: 4, users: 1 });
    },
  );

  pgTest("should count accepted users only", async ({ db }) => {
    // Arrange
    await insertUser(db, "accepted@example.org", { status: "accepted" });
    await insertUser(db, "pending@example.org", { status: "pending" });
    await insertUser(db, "rejected@example.org", { status: "rejected" });
    // Act
    const stats = await createStatsRepository(db).count();
    // Assert
    expect(stats).toEqual({ samples: 0, users: 1 });
  });
});
