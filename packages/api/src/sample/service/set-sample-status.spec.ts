import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { draft } from "../../tests/sample-fixtures.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { setSampleStatus } from "./set-sample-status.ts";

describe("setSampleStatus", () => {
  pgTest(
    "should keep the igsn, internal number and publication year across a withdrawal, a tombstone and a republication",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, draft);
      const published = await publishSample(db, created.id);
      // Act
      const withdrawn = await setSampleStatus(db, created.id, "withdrawn");
      const tombstoned = await setSampleStatus(db, created.id, "tombstone");
      const republished = await setSampleStatus(db, created.id, "published");
      // Assert
      expect(published?.internalNumber).toEqual(expect.any(Number));
      expect(withdrawn).toEqual({ ...published, status: "withdrawn" });
      expect(tombstoned).toEqual({ ...published, status: "tombstone" });
      expect(republished).toEqual(published);
    },
  );
});
