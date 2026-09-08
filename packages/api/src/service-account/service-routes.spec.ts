import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { hashApiKey } from "./api-key.ts";

const KEY = "9tPqk1n0RmWvJ8LxUeYb3sQaZc7Hd2Fg";

describe("GET /service/ping", () => {
  pgTest("should answer ok to a valid api key", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "jean.martin@univ-lorraine.fr");
    await insertServiceAccount(db, "Harvester", owner.id, hashApiKey(KEY));
    const { app } = createApp(db);
    // Act
    const res = await app.request("/service/ping", {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  pgTest.for([
    { rule: "no Authorization header", headers: {} },
    { rule: "an unknown api key", headers: { Authorization: "Bearer nope" } },
  ])("should answer 403 to $rule", async ({ headers }, { db }) => {
    // Arrange
    const owner = await insertUser(db, "jean.martin@univ-lorraine.fr");
    await insertServiceAccount(db, "Harvester", owner.id, hashApiKey(KEY));
    const { app } = createApp(db);
    // Act
    const res = await app.request("/service/ping", { headers });
    // Assert
    expect(res.status).toBe(403);
  });
});
