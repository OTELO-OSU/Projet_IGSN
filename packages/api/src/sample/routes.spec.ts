import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

// requireAuth is stubbed suite-wide in test/setup.ts to gate on the Authorization
// header, so these tests just send (or omit) it.
const authHeader = { Authorization: "Bearer test-token" };

// Invalid payloads are sent through the raw request (the typed RPC client would
// reject them at compile time), so the server's runtime validation is exercised.
async function postSample(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request("/samples", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader },
    body: JSON.stringify(body),
  });
}

describe("sample routes", () => {
  pgTest("should create a sample and return 201", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    // Act
    const res = await client.samples.$post(
      { json: { name: "Basalte du Massif Central", nature: "thin_section" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      data: { name: "Basalte du Massif Central", nature: "thin_section" },
    });
  });

  pgTest("should list created samples", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    await client.samples.$post(
      { json: { name: "Grès de Fontainebleau", nature: "rock_powder" } },
      { headers: authHeader },
    );
    // Act
    const res = await client.samples.$get({
      query: { page: "1", perPage: "10" },
    });
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: [{ name: "Grès de Fontainebleau" }],
      meta: { total: 1 },
    });
  });

  pgTest("should reject an unauthenticated create with 401", async ({ db }) => {
    // Act
    const res = await createApp(db).request("/samples", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Grès", nature: "rock_powder" }),
    });
    // Assert
    expect(res.status).toBe(401);
  });

  pgTest("should reject an empty name with 400", async ({ db }) => {
    // Act
    const res = await postSample(createApp(db), {
      name: "",
      nature: "rock_powder",
    });
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest("should reject an unknown nature with 400", async ({ db }) => {
    // Act
    const res = await postSample(createApp(db), {
      name: "Grès",
      nature: "Roche inconnue",
    });
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest("should reject unknown fields with 400", async ({ db }) => {
    // Act
    const res = await postSample(createApp(db), {
      name: "Grès",
      nature: "rock_powder",
      extra: "x",
    });
    // Assert
    expect(res.status).toBe(400);
  });
});
