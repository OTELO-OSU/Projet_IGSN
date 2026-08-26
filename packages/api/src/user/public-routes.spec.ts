import { publicUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { draft } from "../tests/sample-fixtures.ts";
import { insertSampleCollaborator } from "../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";

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
      const published = await insertSample(db, {
        ...draft,
        name: "Published sample",
      });
      await publishSample(db, published.id);
      const pendingSample = await insertSample(db, {
        ...draft,
        name: "Pending owner sample",
      });
      await publishSample(db, pendingSample.id);
      const draftOnly = await insertSample(db, { ...draft, name: "Draft" });
      await insertSampleOwner(db, published.id, publisher.id);
      await insertSampleOwner(db, pendingSample.id, pending.id);
      await insertSampleCollaborator(
        db,
        draftOnly.id,
        drafter.id,
        "contributor",
      );
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
