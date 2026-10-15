import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

describe("GET /samples/map/points", () => {
  pgTest(
    "should answer the map points rather than a sample named map",
    async ({ db }) => {
      // Act
      const res = await testClient(createApp(db).app).samples.map.points.$get({
        query: {},
      });
      // Assert
      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { data: { numbers: [], longitudes: [], latitudes: [] } },
      });
    },
  );

  pgTest(
    "should announce the uncompressed byte length of its body",
    async ({ db }) => {
      // Act
      const res = await testClient(createApp(db).app).samples.map.points.$get({
        query: {},
      });
      // Assert
      const body = new Uint8Array(await res.arrayBuffer());
      expect({
        uncompressedLength: res.headers.get("X-Uncompressed-Length"),
        contentType: res.headers.get("Content-Type"),
      }).toEqual({
        uncompressedLength: String(body.byteLength),
        contentType: "application/json",
      });
    },
  );
});

describe("GET /samples/map/samples", () => {
  pgTest(
    "should answer the map sample details rather than a sample named map",
    async ({ db }) => {
      // Act
      const res = await testClient(createApp(db).app).samples.map.samples.$get({
        query: { numbers: "1,2" },
      });
      // Assert
      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { data: [] },
      });
    },
  );

  pgTest.for([
    {
      what: "more than 500 numbers",
      numbers: Array.from({ length: 501 }, (_, index) => index + 1).join(","),
    },
    { what: "a non-integer", numbers: "1,2.5" },
    { what: "an empty list", numbers: "" },
  ])("should reject $what", async ({ numbers }, { db }) => {
    // Act
    const res = await testClient(createApp(db).app).samples.map.samples.$get({
      query: { numbers },
    });
    // Assert
    expect({ status: res.status, body: await res.json() }).toEqual({
      status: 400,
      body: { error: "Invalid query parameters" },
    });
  });
});
