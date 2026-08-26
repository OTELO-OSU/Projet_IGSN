import { publicUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";
import type { Transactional } from "../transaction.ts";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";

const link = (
  db: Transactional<DB>,
  userId: string,
  sampleId: string,
  role: DB["user_sample"]["role"],
) =>
  db
    .insertInto("user_sample")
    .values({ user_id: userId, sample_id: sampleId, role })
    .execute();

const draft = (db: Transactional<DB>, name: string) =>
  insertSample(db, {
    name,
    nature: "rock_powder",
    type: null,
    collectionMethod: null,
  });

describe("public user routes", () => {
  pgTest(
    "should list only accepted users linked to a published sample",
    async ({ db }) => {
      // Arrange
      const publisher = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        name: "Curie",
        firstname: "Marie",
      });
      const drafter = await insertUser(db, "pierre.curie@univ-lorraine.fr", {
        name: "Curie",
        firstname: "Pierre",
      });
      const pending = await insertUser(db, "irene.curie@univ-lorraine.fr", {
        name: "Curie",
        firstname: "Irene",
        status: "pending",
      });
      const published = await draft(db, "Published sample");
      await publishSample(db, published.id);
      const pendingSample = await draft(db, "Pending owner sample");
      await publishSample(db, pendingSample.id);
      const draftOnly = await draft(db, "Draft sample");
      await link(db, publisher.id, published.id, "owner");
      await link(db, pending.id, pendingSample.id, "owner");
      await link(db, drafter.id, draftOnly.id, "contributor");
      // Act
      const res = await testClient(createApp(db).app).users.$get({
        query: {},
      });
      // Assert
      expect(res.status).toBe(200);
      expect(publicUsersResponseSchema.parse(await res.json())).toEqual({
        data: [{ id: publisher.id, name: "Curie", firstname: "Marie" }],
      });
    },
  );

  pgTest(
    "should append the included user only when accepted",
    async ({ db }) => {
      // Arrange
      const accepted = await insertUser(db, "jean.martin@univ-lorraine.fr", {
        name: "Martin",
        firstname: "Jean",
      });
      const pending = await insertUser(db, "luc.martin@univ-lorraine.fr", {
        name: "Martin",
        firstname: "Luc",
        status: "pending",
      });
      const client = testClient(createApp(db).app);
      // Act
      const withAccepted = await client.users.$get({
        query: { include: accepted.id },
      });
      const withPending = await client.users.$get({
        query: { include: pending.id },
      });
      // Assert
      expect(await withAccepted.json()).toEqual({
        data: [{ id: accepted.id, name: "Martin", firstname: "Jean" }],
      });
      expect(await withPending.json()).toEqual({ data: [] });
    },
  );
});
