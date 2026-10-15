import { laboratoryIdOf } from "@projet-igsn/domain/institutional-group/laboratory-id-of";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { draft } from "../../tests/sample-fixtures.ts";
import { insertSample } from "./insert-sample.ts";
import { isSampleModerated } from "./is-sample-moderated.ts";

const CALLER = "01890a5d-ac96-774b-bcce-b302099a8001";

describe("moderatedSampleWhere", () => {
  pgTest(
    "should reach a sample stored under a replaced laboratory's id from its successor's manager",
    async ({ db }) => {
      // Arrange
      const sample = await insertSample(db, draft, {
        institutionalOrganization: null,
        institutionalOsu: null,
        institutionalLaboratory: laboratoryIdOf("UMR8109"),
      });
      const scope = managerScope(CALLER, {
        ...NO_MANAGED_GROUPS,
        laboratories: ["UMR8254"],
      });
      // Act
      const moderated = await isSampleModerated(db, sample.id, scope);
      // Assert
      expect(moderated).toBe(true);
    },
  );
});
