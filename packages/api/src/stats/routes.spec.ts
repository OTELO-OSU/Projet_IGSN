import { statsResponseSchema } from "@projet-igsn/domain/stats/stats-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

describe("public stats routes", () => {
  pgTest("should answer the totals to an anonymous reader", async ({ db }) => {
    // Act
    const res = await testClient(createApp(db).app).stats.$get();
    // Assert
    expect({
      status: res.status,
      body: statsResponseSchema.parse(await res.json()),
    }).toEqual({ status: 200, body: { data: { samples: 0, users: 0 } } });
  });
});
