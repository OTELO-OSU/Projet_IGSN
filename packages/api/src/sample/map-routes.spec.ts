import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

describe("GET /samples/map", () => {
  pgTest(
    "should answer the map rather than a sample named map",
    async ({ db }) => {
      // Act
      const res = await testClient(createApp(db).app).samples.map.$get({
        query: { viewport: "-180,-90,180,90", zoom: "3" },
      });
      // Assert
      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { data: [], meta: { extent: null } },
      });
    },
  );

  pgTest.for([
    { what: "missing", query: { zoom: "3" } },
    { what: "invalid", query: { viewport: "0,50,10,40", zoom: "3" } },
  ])("should reject a $what viewport", async ({ query }, { db }) => {
    // Act
    const res = await testClient(createApp(db).app).samples.map.$get({
      query: query as unknown as { viewport: string; zoom: string },
    });
    // Assert
    expect({ status: res.status, body: await res.json() }).toEqual({
      status: 400,
      body: { error: "Invalid query parameters" },
    });
  });
});
