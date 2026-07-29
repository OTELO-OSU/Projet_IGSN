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

  describe("GET /admin/me", () => {
    pgTest("rejects a request with no bearer token", async ({ db }) => {
      const client = testClient(createApp(db));

      const res = await client.admin.me.$get();
      expect(res.status).toBe(401);
    });
  });

  describe("error handling", () => {
    pgTest("should answer an unexpected failure as JSON", async ({ db }) => {
      const app = createApp(db);
      vi.spyOn(db, "selectFrom").mockImplementation(() => {
        throw new Error("connection terminated: password=hunter2");
      });
      vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await app.request("/samples?page=1&perPage=10");

      expect(res.status).toBe(500);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toEqual({ error: "Internal server error" });
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

  // Thin wiring checks only; the limiter's own behaviour lives in
  // rate-limit/middleware.spec.ts.
  describe("rate limiting", () => {
    beforeEach(() => {
      process.env.TRUST_PROXY_HEADERS = "true";
      process.env.RATE_LIMIT_SAMPLES_LIST_POINTS = "1";
      process.env.RATE_LIMIT_ADMIN_SAMPLES_LIST_POINTS = "1";
      process.env.CORS_ORIGINS = "http://localhost:3001";
    });

    afterEach(() => {
      delete process.env.TRUST_PROXY_HEADERS;
      delete process.env.RATE_LIMIT_SAMPLES_LIST_POINTS;
      delete process.env.RATE_LIMIT_ADMIN_SAMPLES_LIST_POINTS;
      delete process.env.CORS_ORIGINS;
    });

    pgTest("should limit a public read per client IP", async ({ db }) => {
      const app = createApp(db);
      const from = (ip: string) =>
        app.request("/samples", { headers: { "X-Real-IP": ip } });

      expect((await from("10.0.0.1")).status).toBe(200);
      expect((await from("10.0.0.1")).status).toBe(429);
      expect((await from("10.0.0.2")).status).toBe(200);
    });

    pgTest(
      "should limit an admin read per authenticated user",
      async ({ db }) => {
        const app = createApp(db);
        const from = (token: string) =>
          app.request("/admin/samples", {
            headers: { Authorization: `Bearer ${token}` },
          });

        expect((await from("user-1")).status).toBe(200);
        expect((await from("user-1")).status).toBe(429);
        expect((await from("user-2")).status).toBe(200);
      },
    );

    // None of the rate-limit headers are CORS-safelisted, so without this the
    // admin SPA reads null and paces its retries on a guess.
    pgTest("should let a browser read the 429 headers", async ({ db }) => {
      const app = createApp(db);
      const from = () =>
        app.request("/samples", {
          headers: {
            "X-Real-IP": "10.0.0.9",
            Origin: "http://localhost:3001",
          },
        });

      expect((await from()).status).toBe(200);
      const refused = await from();

      expect(refused.status).toBe(429);
      expect(
        refused.headers.get("access-control-expose-headers")?.split(","),
      ).toEqual([
        "Retry-After",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
      ]);
    });

    pgTest("should never limit a CORS preflight", async ({ db }) => {
      const app = createApp(db);
      const preflight = () =>
        app.request("/samples", {
          method: "OPTIONS",
          headers: {
            Origin: "http://localhost:3001",
            "Access-Control-Request-Method": "GET",
          },
        });

      const statuses = await Promise.all(
        Array.from({ length: 5 }, async () => (await preflight()).status),
      );

      expect([...new Set(statuses)]).toEqual([204]);
    });

    pgTest(
      "should reject an unauthenticated admin request before limiting it",
      async ({ db }) => {
        const app = createApp(db);

        const statuses = await Promise.all(
          Array.from(
            { length: 3 },
            async () => (await app.request("/admin/samples")).status,
          ),
        );

        expect([...new Set(statuses)]).toEqual([401]);
      },
    );
  });
});
