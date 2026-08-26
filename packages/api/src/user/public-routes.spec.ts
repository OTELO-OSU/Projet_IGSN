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
    "should list accepted users linked to a published sample, plus the included accepted one",
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
      const client = testClient(createApp(db).app);
      const marie = { id: publisher.id, name: "Curie", firstname: "Marie" };
      // Act
      const res = await client.users.$get({ query: {} });
      const withDrafter = await client.users.$get({
        query: { include: drafter.id },
      });
      const withPending = await client.users.$get({
        query: { include: pending.id },
      });
      // Assert
      expect(res.status).toBe(200);
      expect(publicUsersResponseSchema.parse(await res.json())).toEqual({
        data: [marie],
      });
      expect(await withDrafter.json()).toEqual({
        data: [marie, { id: drafter.id, name: "Curie", firstname: "Pierre" }],
      });
      expect(await withPending.json()).toEqual({ data: [marie] });
    },
  );

  pgTest(
    "should ignore a malformed include instead of failing",
    async ({ db }) => {
      // Act
      const res = await createApp(db).app.request("/users?include=not-a-uuid");
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [] });
    },
  );
});
