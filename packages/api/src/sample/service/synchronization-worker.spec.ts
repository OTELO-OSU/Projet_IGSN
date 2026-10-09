import type { SynchronizationStatus } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../../db.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import { savepointTransactions } from "../../tests/savepoint-transactions.ts";
import {
  dataCiteEventsOf,
  doiUrlOf,
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../../tests/stub-datacite.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { drainSynchronizationQueue } from "./synchronization-worker.ts";

const NO_DELAYS = [0, 0, 0, 0, 0];

const failing = () =>
  Promise.resolve(new Response("DataCite is down", { status: 500 }));

const setSynchronizationStatus = (
  db: Kysely<DB>,
  id: string,
  status: SynchronizationStatus,
) =>
  db
    .updateTable("sample")
    .set({ synchronization_status: status })
    .where("id", "=", id)
    .execute();

async function insertPending(
  db: Kysely<DB>,
  name: string,
  parentIds: string[] = [],
) {
  const { id } = await insertSample(db, {
    ...publishableSample,
    name,
    parentIds,
  });
  await setSynchronizationStatus(db, id, "pending");
  return id;
}

async function insertPublished(db: Kysely<DB>, name: string) {
  const { id } = await insertSample(db, { ...publishableSample, name });
  return (await publishSample(db, id, "published", STUB_DATACITE_CONFIG))!;
}

const rowsOf = (db: Kysely<DB>, ids: string[]) =>
  db
    .selectFrom("sample")
    .select([
      "id",
      "status",
      "igsn",
      "synchronization_status",
      "synchronization_error",
    ])
    .where("id", "in", ids)
    .orderBy("id")
    .execute();

const drain = (db: Kysely<DB>, delays = NO_DELAYS) =>
  drainSynchronizationQueue(
    savepointTransactions(db),
    STUB_DATACITE_CONFIG,
    delays,
  );

describe("drainSynchronizationQueue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  pgTest("should publish every pending draft, oldest first", async ({ db }) => {
    // Arrange
    const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
    const ids = [
      await insertPending(db, "First"),
      await insertPending(db, "Second"),
      await insertPending(db, "Third"),
    ];
    // Act
    await drain(db);
    // Assert
    expect(await rowsOf(db, ids)).toEqual(
      ids.map((id) => ({
        id,
        status: "published",
        igsn: generateIgsnSuffix(id),
        synchronization_status: "synced",
        synchronization_error: null,
      })),
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      ids.map((id) => doiUrlOf(generateIgsnSuffix(id))),
    );
  });

  pgTest(
    "should re-PUT a pending published sample with the publish event",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const sample = await insertPublished(db, "Edited");
      await setSynchronizationStatus(db, sample.id, "pending");
      fetchMock.mockClear();
      // Act
      await drain(db);
      // Assert
      expect(await rowsOf(db, [sample.id])).toEqual([
        {
          id: sample.id,
          status: "published",
          igsn: sample.igsn,
          synchronization_status: "synced",
          synchronization_error: null,
        },
      ]);
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        doiUrlOf(sample.igsn),
      ]);
      expect(dataCiteEventsOf(fetchMock)).toEqual(["publish"]);
    },
  );

  pgTest(
    "should retry a refused PUT until it succeeds, the refusal leaving the row pending",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      fetchMock.mockImplementationOnce(failing).mockImplementationOnce(failing);
      const id = await insertPending(db, "Retried");
      // Act
      await drain(db);
      // Assert
      expect(await rowsOf(db, [id])).toEqual([
        {
          id,
          status: "published",
          igsn: generateIgsnSuffix(id),
          synchronization_status: "synced",
          synchronization_error: null,
        },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );

  pgTest(
    "should fail the row alone once its retries run out, then synchronize the next pending one",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const failingId = await insertPending(db, "Failing");
      const nextId = await insertPending(db, "Next");
      fetchMock.mockImplementation((url: string) =>
        url === doiUrlOf(generateIgsnSuffix(failingId))
          ? failing()
          : Promise.resolve(new Response("{}", { status: 201 })),
      );
      // Act
      await drain(db);
      // Assert
      expect(await rowsOf(db, [failingId, nextId])).toEqual([
        {
          id: failingId,
          status: "draft",
          igsn: null,
          synchronization_status: "failed",
          synchronization_error: "DataCite registration failed (HTTP 500)",
        },
        {
          id: nextId,
          status: "published",
          igsn: generateIgsnSuffix(nextId),
          synchronization_status: "synced",
          synchronization_error: null,
        },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1 + NO_DELAYS.length + 1);
    },
  );

  pgTest(
    "should PUT a pending parent's record carrying its published child as IsSourceOf",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const parent = await insertPublished(db, "Parent");
      const { id: childId } = await insertSample(db, {
        ...publishableSample,
        parentIds: [parent.id],
      });
      const child = (await publishSample(
        db,
        childId,
        "published",
        STUB_DATACITE_CONFIG,
      ))!;
      fetchMock.mockClear();
      // Act
      await drain(db);
      // Assert
      expect(
        fetchMock.mock.calls.map(([url, init]) => ({
          url,
          relatedIdentifiers: JSON.parse(init.body).data.attributes
            .relatedIdentifiers,
        })),
      ).toEqual([
        {
          url: doiUrlOf(parent.igsn),
          relatedIdentifiers: [
            expect.objectContaining({
              relatedIdentifier: child.igsn,
              relationType: "IsSourceOf",
            }),
          ],
        },
      ]);
    },
  );
});
