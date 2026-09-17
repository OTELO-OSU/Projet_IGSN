import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { sampleLineageResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { insertSampleParents } from "./service/insert-sample-parents.ts";

type Db = Kysely<DB>;

const UNKNOWN_IGSN = "0123456789ABCDEFGHJKMNPQRS";

async function insertLineageSample(
  db: Db,
  ownerId: string,
  name: string,
  parentIds: string[] = [],
  status: Sample["status"] = "published",
): Promise<Sample> {
  const sample = await insertParent(db, ownerId, status, name);
  await insertSampleParents(db, sample.id, parentIds);
  return sample;
}

async function getLineage(db: Db, igsn: string) {
  const res = await testClient(createApp(db).app).samples[":igsn"].lineage.$get(
    { param: { igsn } },
  );
  expect(res.status).toBe(200);
  return sampleLineageResponseSchema.parse(await res.json()).data;
}

async function lineageStatus(db: Db, igsn: string) {
  const res = await testClient(createApp(db).app).samples[":igsn"].lineage.$get(
    { param: { igsn } },
  );
  return res.status;
}

const owner = (db: Db) =>
  insertUser(db, "owner@univ-lorraine.fr").then((user) => user.id);

describe("the public sample lineage", () => {
  pgTest(
    "should answer the sample alone when it has no relatives",
    async ({ db }) => {
      // Arrange
      const ownerId = await owner(db);
      const root = await insertLineageSample(db, ownerId, "Lone basalt");
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(lineage).toEqual({
        nodes: [
          {
            id: root.id,
            igsn: root.igsn,
            name: root.name,
            generation: 0,
            tombstone: false,
          },
        ],
        edges: [],
      });
    },
  );

  pgTest(
    "should answer both ancestors and descendants with their generation",
    async ({ db }) => {
      // Arrange
      const ownerId = await owner(db);
      const grandparent = await insertLineageSample(db, ownerId, "Grandparent");
      const parent = await insertLineageSample(db, ownerId, "Parent", [
        grandparent.id,
      ]);
      const root = await insertLineageSample(db, ownerId, "Root", [parent.id]);
      const child = await insertLineageSample(db, ownerId, "Child", [root.id]);
      const grandchild = await insertLineageSample(db, ownerId, "Grandchild", [
        child.id,
      ]);
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(
        Object.fromEntries(
          lineage.nodes.map((node) => [node.name, node.generation]),
        ),
      ).toEqual({
        Grandparent: -2,
        Parent: -1,
        Root: 0,
        Child: 1,
        Grandchild: 2,
      });
      expect(lineage.edges).toHaveLength(4);
      const ids = new Set(lineage.nodes.map((node) => node.id));
      for (const edge of lineage.edges) {
        expect(ids.has(edge.parentId)).toBe(true);
        expect(ids.has(edge.childId)).toBe(true);
      }
      expect(lineage.edges).toContainEqual({
        parentId: grandparent.id,
        childId: parent.id,
      });
      expect(lineage.edges).toContainEqual({
        parentId: child.id,
        childId: grandchild.id,
      });
    },
  );

  pgTest(
    "should leave out a sibling of the requested sample",
    async ({ db }) => {
      // Arrange
      const ownerId = await owner(db);
      const parent = await insertLineageSample(db, ownerId, "Parent");
      const root = await insertLineageSample(db, ownerId, "Root", [parent.id]);
      await insertLineageSample(db, ownerId, "Sibling", [parent.id]);
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(lineage.nodes.map((node) => node.name)).toEqual([
        "Parent",
        "Root",
      ]);
    },
  );

  pgTest(
    "should hide a draft descendant and everything below it",
    async ({ db }) => {
      // Arrange
      const ownerId = await owner(db);
      const root = await insertLineageSample(db, ownerId, "Root");
      const hidden = await insertLineageSample(
        db,
        ownerId,
        "Draft child",
        [root.id],
        "draft",
      );
      await insertLineageSample(db, ownerId, "Published grandchild", [
        hidden.id,
      ]);
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(lineage.nodes.map((node) => node.name)).toEqual(["Root"]);
      expect(lineage.edges).toEqual([]);
    },
  );

  pgTest.for(["withdrawn", "tombstone"] as const)(
    "should show a %s descendant and everything below it",
    async (status, { db }) => {
      // Arrange
      const ownerId = await owner(db);
      const root = await insertLineageSample(db, ownerId, "Root");
      const permanent = await insertLineageSample(
        db,
        ownerId,
        "Non-published child",
        [root.id],
        status,
      );
      const grandchild = await insertLineageSample(
        db,
        ownerId,
        "Published grandchild",
        [permanent.id],
      );
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(lineage.nodes.map((node) => node.name)).toEqual([
        "Root",
        "Non-published child",
        "Published grandchild",
      ]);
      expect(lineage.edges).toEqual([
        { parentId: root.id, childId: permanent.id },
        { parentId: permanent.id, childId: grandchild.id },
      ]);
      expect(
        lineage.nodes.find((node) => node.id === permanent.id)?.tombstone,
      ).toBe(status === "tombstone");
    },
  );

  pgTest.for(["withdrawn", "tombstone"] as const)(
    "should show a %s ancestor and everything above it",
    async (status, { db }) => {
      // Arrange
      const ownerId = await owner(db);
      const grandparent = await insertLineageSample(
        db,
        ownerId,
        "Published grandparent",
      );
      const permanent = await insertLineageSample(
        db,
        ownerId,
        "Non-published parent",
        [grandparent.id],
        status,
      );
      const root = await insertLineageSample(db, ownerId, "Root", [
        permanent.id,
      ]);
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(lineage.nodes.map((node) => node.name)).toEqual([
        "Published grandparent",
        "Non-published parent",
        "Root",
      ]);
      expect(lineage.edges).toEqual([
        { parentId: grandparent.id, childId: permanent.id },
        { parentId: permanent.id, childId: root.id },
      ]);
      expect(
        lineage.nodes.find((node) => node.id === permanent.id)?.tombstone,
      ).toBe(status === "tombstone");
    },
  );

  pgTest(
    "should hide a draft ancestor and everything above it",
    async ({ db }) => {
      // Arrange
      const ownerId = await owner(db);
      const grandparent = await insertLineageSample(
        db,
        ownerId,
        "Published grandparent",
      );
      const draft = await insertLineageSample(
        db,
        ownerId,
        "Draft parent",
        [grandparent.id],
        "draft",
      );
      const root = await insertLineageSample(db, ownerId, "Root", [draft.id]);
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(lineage.nodes.map((node) => node.name)).toEqual(["Root"]);
      expect(lineage.edges).toEqual([]);
    },
  );

  pgTest("should answer 404 for an unknown IGSN", async ({ db }) => {
    // Act & Assert
    expect(await lineageStatus(db, UNKNOWN_IGSN)).toBe(404);
  });

  pgTest("should answer 404 for a tombstoned sample", async ({ db }) => {
    // Arrange
    const ownerId = await owner(db);
    const root = await insertLineageSample(
      db,
      ownerId,
      "Root",
      [],
      "tombstone",
    );
    // Act & Assert
    expect(await lineageStatus(db, root.igsn!)).toBe(404);
  });

  pgTest("should answer the lineage of a withdrawn sample", async ({ db }) => {
    // Arrange
    const ownerId = await owner(db);
    const parent = await insertLineageSample(db, ownerId, "Parent");
    const root = await insertLineageSample(
      db,
      ownerId,
      "Withdrawn root",
      [parent.id],
      "withdrawn",
    );
    // Act
    const lineage = await getLineage(db, root.igsn!);
    // Assert
    expect(lineage.nodes.map((node) => node.name)).toEqual([
      "Parent",
      "Withdrawn root",
    ]);
  });

  pgTest("should answer 400 for a malformed IGSN", async ({ db }) => {
    // Act & Assert
    expect(await lineageStatus(db, "not-an-igsn")).toBe(400);
  });

  pgTest(
    "should keep a node reached at two depths at its farthest generation",
    async ({ db }) => {
      // Arrange
      const ownerId = await owner(db);
      const shared = await insertLineageSample(db, ownerId, "Shared");
      const parent = await insertLineageSample(db, ownerId, "Parent", [
        shared.id,
      ]);
      const root = await insertLineageSample(db, ownerId, "Root", [
        parent.id,
        shared.id,
      ]);
      // Act
      const lineage = await getLineage(db, root.igsn!);
      // Assert
      expect(lineage.nodes.filter((node) => node.id === shared.id)).toEqual([
        {
          id: shared.id,
          igsn: shared.igsn,
          name: shared.name,
          generation: -2,
          tombstone: false,
        },
      ]);
      expect(lineage.edges).toContainEqual({
        parentId: shared.id,
        childId: root.id,
      });
      expect(lineage.edges).toContainEqual({
        parentId: shared.id,
        childId: parent.id,
      });
    },
  );

  pgTest("should answer a shared grandparent once", async ({ db }) => {
    // Arrange
    const ownerId = await owner(db);
    const grandparent = await insertLineageSample(db, ownerId, "Grandparent");
    const first = await insertLineageSample(db, ownerId, "Parent A", [
      grandparent.id,
    ]);
    const second = await insertLineageSample(db, ownerId, "Parent B", [
      grandparent.id,
    ]);
    const root = await insertLineageSample(db, ownerId, "Root", [
      first.id,
      second.id,
    ]);
    // Act
    const lineage = await getLineage(db, root.igsn!);
    // Assert
    expect(
      lineage.nodes.filter((node) => node.id === grandparent.id),
    ).toHaveLength(1);
    expect(
      lineage.nodes.find((node) => node.id === grandparent.id)?.generation,
    ).toBe(-2);
    expect(lineage.edges).toContainEqual({
      parentId: grandparent.id,
      childId: first.id,
    });
    expect(lineage.edges).toContainEqual({
      parentId: grandparent.id,
      childId: second.id,
    });
  });
});
