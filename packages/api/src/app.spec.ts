import { testClient } from "hono/testing";
import { afterEach, beforeEach, describe, expect } from "vitest";

import { createApp } from "./app.ts";
import {
  AUTHENTICATED_USER_BUDGET,
  PUBLIC_IP_BUDGET,
} from "./rate-limit/config.ts";
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
  // rate-limit/middleware.spec.ts. The budgets are fixed (config.ts), so these
  // exhaust the real tier rather than lowering it.
  describe("rate limiting", () => {
    beforeEach(() => {
      process.env.TRUST_PROXY_HEADERS = "true";
      process.env.CORS_ORIGINS = "http://localhost:3001";
    });

    afterEach(() => {
      delete process.env.TRUST_PROXY_HEADERS;
      delete process.env.CORS_ORIGINS;
    });

    // Spend a tier's whole budget, asserting none of it is refused yet.
    const spend = async (
      fire: () => Response | Promise<Response>,
      times: number,
    ) => {
      for (let i = 0; i < times; i++) {
        expect((await fire()).status).not.toBe(429);
      }
    };

    pgTest("should limit a public read per client IP", async ({ db }) => {
      const app = createApp(db);
      const from = (ip: string) =>
        app.request("/samples", { headers: { "X-Real-IP": ip } });

      await spend(() => from("10.0.0.1"), PUBLIC_IP_BUDGET.points);
      expect((await from("10.0.0.1")).status).toBe(429);
      expect((await from("10.0.0.2")).status).toBe(200);
    });

    pgTest(
      "should limit an admin route per authenticated user",
      async ({ db }) => {
        const app = createApp(db);
        const from = (token: string) =>
          app.request("/admin/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

        await spend(() => from("user-1"), AUTHENTICATED_USER_BUDGET.points);
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

      await spend(from, PUBLIC_IP_BUDGET.points);
      const refused = await from();

      expect(refused.status).toBe(429);
      expect(refused.headers.get("access-control-allow-origin")).toBe(
        "http://localhost:3001",
      );
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

    // The healthcheck sits outside the public sample mount, so the IP limiter
    // never touches it however hard the container polls.
    pgTest("should never limit the healthcheck", async ({ db }) => {
      const app = createApp(db);

      const statuses = await Promise.all(
        Array.from(
          { length: PUBLIC_IP_BUDGET.points + 5 },
          async () =>
            (await app.request("/", { headers: { "X-Real-IP": "10.0.0.1" } }))
              .status,
        ),
      );

      expect([...new Set(statuses)]).toEqual([200]);
    });

    pgTest(
      "should pass every request through when disabled",
      async ({ db }) => {
        process.env.RATE_LIMIT_ENABLED = "false";
        const app = createApp(db);
        const from = () =>
          app.request("/samples", { headers: { "X-Real-IP": "10.0.0.1" } });

        const first = await from();
        expect(first.status).toBe(200);
        expect(first.headers.get("ratelimit-limit")).toBeNull();
        for (let i = 0; i < PUBLIC_IP_BUDGET.points; i++) {
          expect((await from()).status).toBe(200);
        }
      },
    );
  });
});
