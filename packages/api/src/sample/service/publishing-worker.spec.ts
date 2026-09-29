import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../../db.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import {
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../../tests/stub-datacite.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { drainPublishingQueue } from "./publishing-worker.ts";

const NO_DELAYS = [0, 0, 0, 0, 0];

const failing = () =>
  Promise.resolve(new Response("DataCite is down", { status: 500 }));

async function insertAs(
  db: Kysely<DB>,
  name: string,
  status: "draft" | "publishing" | "published",
) {
  const { id } = await insertSample(db, { ...publishableSample, name });
  if (status === "publishing") {
    await db
      .updateTable("sample")
      .set({ status })
      .where("id", "=", id)
      .execute();
  }
  if (status === "published") await publishSample(db, id);
  return id;
}

const rowsOf = (db: Kysely<DB>, ids: string[]) =>
  db
    .selectFrom("sample")
    .select(["id", "status", "publishing_error"])
    .where("id", "in", ids)
    .orderBy("id")
    .execute();

describe("drainPublishingQueue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  pgTest(
    "should publish every waiting sample, oldest first",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const ids = [
        await insertAs(db, "First", "publishing"),
        await insertAs(db, "Second", "publishing"),
        await insertAs(db, "Third", "publishing"),
      ];
      // Act
      await drainPublishingQueue(db, STUB_DATACITE_CONFIG, NO_DELAYS);
      // Assert
      expect(
        await db
          .selectFrom("sample")
          .select(["id", "status", "igsn", "publishing_error"])
          .where("id", "in", ids)
          .orderBy("id")
          .execute(),
      ).toEqual(
        ids.map((id) => ({
          id,
          status: "published",
          igsn: generateIgsnSuffix(id),
          publishing_error: null,
        })),
      );
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
        ids.map(
          (id) =>
            `${STUB_DATACITE_CONFIG.host}/dois/${STUB_DATACITE_CONFIG.prefix}/${generateIgsnSuffix(id)}`,
        ),
      );
    },
  );

  pgTest(
    "should retry a failed DataCite sync until it succeeds",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      fetchMock.mockImplementationOnce(failing).mockImplementationOnce(failing);
      const id = await insertAs(db, "Retried", "publishing");
      // Act
      await drainPublishingQueue(db, STUB_DATACITE_CONFIG, NO_DELAYS);
      // Assert
      expect(await rowsOf(db, [id])).toEqual([
        { id, status: "published", publishing_error: null },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );

  pgTest(
    "should fail the sample and every other waiting one with the DataCite error once its retries run out",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const ids = [
        await insertAs(db, "Failing", "publishing"),
        await insertAs(db, "Waiting", "publishing"),
        await insertAs(db, "Draft", "draft"),
        await insertAs(db, "Published", "published"),
      ];
      fetchMock.mockImplementation(failing);
      // Act
      await drainPublishingQueue(db, STUB_DATACITE_CONFIG, NO_DELAYS);
      // Assert
      const error = "DataCite registration failed (HTTP 500)";
      expect(await rowsOf(db, ids)).toEqual([
        { id: ids[0], status: "publish_failed", publishing_error: error },
        { id: ids[1], status: "publish_failed", publishing_error: error },
        { id: ids[2], status: "draft", publishing_error: null },
        { id: ids[3], status: "published", publishing_error: null },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1 + NO_DELAYS.length);
    },
  );
});
