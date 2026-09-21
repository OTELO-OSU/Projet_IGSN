import { afterEach, beforeEach, describe, expect, vi } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { draft, publishableSample } from "../../tests/sample-fixtures.ts";
import {
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../../tests/stub-datacite.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { setSampleStatus } from "./set-sample-status.ts";

describe("setSampleStatus", () => {
  pgTest(
    "should keep the igsn and publication year across a withdrawal and a republication",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, draft);
      const published = await publishSample(db, created.id);
      // Act
      const withdrawn = await setSampleStatus(db, created.id, "withdrawn");
      const republished = await setSampleStatus(db, created.id, "published");
      // Assert
      expect(withdrawn).toEqual({ ...published, status: "withdrawn" });
      expect(republished).toEqual(published);
    },
  );
});

describe("setSampleStatus with DataCite configured", () => {
  let fetchMock: ReturnType<typeof stubDataCite>;

  beforeEach(() => {
    fetchMock = stubDataCite(new Response("{}", { status: 201 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const attributesOfCall = (call: number) =>
    JSON.parse(fetchMock.mock.calls[call]![1].body).data.attributes;

  pgTest(
    "should sync the DOI state and url of every status change",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, publishableSample);
      const published = await publishSample(
        db,
        created.id,
        "published",
        STUB_DATACITE_CONFIG,
      );
      const landingPage = `http://localhost:3000/samples/${published?.igsn}`;
      fetchMock.mockClear();
      // Act
      await setSampleStatus(db, created.id, "withdrawn", STUB_DATACITE_CONFIG);
      await setSampleStatus(db, created.id, "tombstone", STUB_DATACITE_CONFIG);
      await setSampleStatus(db, created.id, "published", STUB_DATACITE_CONFIG);
      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(attributesOfCall(0)).toMatchObject({
        event: "hide",
        url: landingPage,
      });
      expect(attributesOfCall(1)).toMatchObject({
        event: "hide",
        url: "http://localhost:3000/tombstone",
      });
      expect(attributesOfCall(2)).toMatchObject({
        event: "publish",
        url: landingPage,
      });
    },
  );

  pgTest(
    "should send nothing when the sample was published without DataCite",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, publishableSample);
      await publishSample(db, created.id);
      fetchMock.mockClear();
      // Act
      await setSampleStatus(db, created.id, "withdrawn", STUB_DATACITE_CONFIG);
      // Assert
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
