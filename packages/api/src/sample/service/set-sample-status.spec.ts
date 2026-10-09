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
      const withdrawn = await setSampleStatus(db, created.id, {
        status: "withdrawn",
      });
      const tombstoned = await setSampleStatus(db, created.id, {
        status: "tombstone",
      });
      const republished = await setSampleStatus(db, created.id, {
        status: "published",
      });
      // Assert
      expect(published?.internalNumber).toEqual(expect.any(Number));
      const queued = { ...published, synchronizationStatus: "pending" };
      expect(withdrawn).toEqual({ ...queued, status: "withdrawn" });
      expect(tombstoned).toEqual({ ...queued, status: "tombstone" });
      expect(republished).toEqual(queued);
    },
  );
});
