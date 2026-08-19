import { manualGroupsResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { pgTest } from "../tests/pg-test.ts";

const PUBLISHED = "01890a5d-ac96-774b-bcce-b302099a9001";
const DRAFT_ONLY = "01890a5d-ac96-774b-bcce-b302099a9002";
const EMPTY = "01890a5d-ac96-774b-bcce-b302099a9003";

describe("public manual group routes", () => {
  pgTest(
    "should list only the groups holding a published sample",
    async ({ db }) => {
      // Arrange
      await db
        .insertInto("manual_group")
        .values([
          { id: PUBLISHED, name: "ANR CritMet" },
          { id: DRAFT_ONLY, name: "ProfilLoire 2024" },
          { id: EMPTY, name: "OZCAR-RI" },
        ])
        .execute();
      const published = await insertSample(db, {
        name: "Published sample",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        manualGroupIds: [PUBLISHED],
      });
      await publishSample(db, published.id);
      await insertSample(db, {
        name: "Draft sample",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        manualGroupIds: [DRAFT_ONLY],
      });
      // Act
      const res = await testClient(createApp(db).app)["manual-groups"].$get();
      // Assert
      expect(res.status).toBe(200);
      expect(manualGroupsResponseSchema.parse(await res.json())).toEqual({
        data: [{ id: PUBLISHED, name: "ANR CritMet" }],
      });
    },
  );
});
