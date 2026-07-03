import { testClient } from "hono/testing";
import { afterEach, beforeEach, describe, expect } from "vitest";

import { createApp } from "./app.ts";
import { pgTest } from "./tests/pg-test.ts";

describe("app", () => {
  describe("GET /", () => {
    pgTest("should return Hello World", async ({ db }) => {
      const client = testClient(createApp(db));

      const res = await client.index.$get();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ message: "OK" });
    });
  });

  describe("GET /me", () => {
    pgTest("rejects a request with no bearer token", async ({ db }) => {
      const client = testClient(createApp(db));

      const res = await client.me.$get();
      expect(res.status).toBe(401);
    });
  });

  describe("CORS", () => {
    const allowedOrigin = "http://localhost:3001";

    beforeEach(() => {
      process.env.CORS_ORIGINS = `${allowedOrigin},https://admin.example.test`;
    });

    afterEach(() => {
      delete process.env.CORS_ORIGINS;
    });

    pgTest(
      "should reflect the allow-origin header for an allowed origin",
      async ({ db }) => {
        const client = testClient(createApp(db));

        const res = await client.index.$get(undefined, {
          headers: { Origin: allowedOrigin },
        });

        expect(res.headers.get("access-control-allow-origin")).toBe(
          allowedOrigin,
        );
        expect(res.headers.get("access-control-allow-credentials")).toBe(
          "true",
        );
      },
    );

    pgTest(
      "should not set allow-origin for a disallowed origin",
      async ({ db }) => {
        const client = testClient(createApp(db));

        const res = await client.index.$get(undefined, {
          headers: { Origin: "https://evil.example.test" },
        });

        expect(res.headers.get("access-control-allow-origin")).toBeNull();
      },
    );

    pgTest(
      "should allow Authorization and Content-Type headers on preflight",
      async ({ db }) => {
        const app = createApp(db);

        const res = await app.request("/samples", {
          method: "OPTIONS",
          headers: {
            Origin: allowedOrigin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
          },
        });

        expect(res.headers.get("access-control-allow-headers")).toBe(
          "Authorization,Content-Type",
        );
      },
    );

    pgTest(
      "should deny every origin when CORS_ORIGINS is empty",
      async ({ db }) => {
        delete process.env.CORS_ORIGINS;
        const client = testClient(createApp(db));

        const res = await client.index.$get(undefined, {
          headers: { Origin: allowedOrigin },
        });

        expect(res.headers.get("access-control-allow-origin")).toBeNull();
      },
    );
  });
});
