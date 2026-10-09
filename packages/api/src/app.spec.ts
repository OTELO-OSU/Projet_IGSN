import { testClient } from "hono/testing";
import { afterEach, beforeEach, describe, expect } from "vitest";

import { createApp } from "./app.ts";
import {
  AUTHENTICATED_USER_BUDGET,
  CONTACT_MAIL_IP_BUDGET,
  MAP_IP_BUDGET,
  IMPORT_TEMPLATE_USER_BUDGET,
  MAIL_REQUEST_USER_BUDGET,
  PUBLIC_IP_BUDGET,
} from "./rate-limit/config.ts";
import { insertSample } from "./sample/service/insert-sample.ts";
import { insertUser } from "./tests/insert-user.ts";
import { pgTest } from "./tests/pg-test.ts";
import { tokenEmail } from "./tests/provision-user.ts";
import { insertSampleOwner } from "./user-sample/insert-sample-owner.ts";

const UNKNOWN_ID = "01890a5d-ac96-774b-bcce-b302099a9999";

describe("app", () => {
  describe("GET /admin/currentUser", () => {
    const authHeader = { Authorization: "Bearer test-token" };
    const callerEmail = tokenEmail("test-token");

    pgTest("rejects a request with no bearer token", async ({ db }) => {
      const client = testClient(createApp(db).app);

      const res = await client.admin.currentUser.$get();
      expect(res.status).toBe(401);
    });

    pgTest("should report the caller's moderation state", async ({ db }) => {
      // Arrange
      await insertUser(db, callerEmail, {
        status: "accepted",
        superAdmin: true,
      });
      // Act
      const res = await testClient(createApp(db).app).admin.currentUser.$get(
        undefined,
        { headers: authHeader },
      );
      // Assert
      expect(await res.json()).toEqual({
        id: expect.any(String),
        sub: "test-token",
        email: callerEmail,
        orcid: null,
        institutionalOrganization: null,
        institutionalOsu: null,
        institutionalLaboratory: null,
        status: "accepted",
        superAdmin: true,
        charterAccepted: true,
        managedLaboratories: [],
        managedManualGroups: [],
      });
    });
  });

  describe("a rejected caller", () => {
    const authHeader = { Authorization: "Bearer test-token" };
    const rejectedEmail = tokenEmail("test-token");

    pgTest("should be refused on a read and on a write", async ({ db }) => {
      // Arrange
      await insertUser(db, rejectedEmail, { status: "rejected" });
      const app = createApp(db).app;
      // Act
      const read = await app.request("/admin/samples?page=1&perPage=10", {
        headers: authHeader,
      });
      const write = await app.request("/admin/samples", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader },
        body: JSON.stringify({
          name: "Basalte",
          nature: "thin_section",
          type: null,
          collectionMethod: null,
        }),
      });
      // Assert
      expect([read.status, write.status]).toEqual([403, 403]);
      await expect(
        db.selectFrom("sample").selectAll().execute(),
      ).resolves.toEqual([]);
    });

    pgTest("should keep the samples they already own", async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, rejectedEmail);
      const sample = await insertSample(db, {
        name: "Granite",
        nature: "powder",
        type: null,
        collectionMethod: null,
      });
      await insertSampleOwner(db, sample.id, owner.id);
      await db
        .updateTable("user")
        .set({ status: "rejected" })
        .where("id", "=", owner.id)
        .execute();
      // Act
      const res = await createApp(db).app.request("/admin/samples", {
        headers: authHeader,
      });
      // Assert
      expect(res.status).toBe(403);
      await expect(
        db.selectFrom("sample").select("name").execute(),
      ).resolves.toEqual([{ name: "Granite" }]);
    });
  });

  describe("error handling", () => {
    pgTest("should answer an unexpected failure as JSON", async ({ db }) => {
      const app = createApp(db).app;
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
        const client = testClient(createApp(db).app);

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
        const client = testClient(createApp(db).app);

        const res = await client.index.$get(undefined, {
          headers: { Origin: "https://evil.example.test" },
        });

        expect(res.headers.get("access-control-allow-origin")).toBeNull();
      },
    );

    pgTest(
      "should allow the Authorization, Content-Type and tus headers on preflight",
      async ({ db }) => {
        const app = createApp(db).app;

        const res = await app.request("/samples", {
          method: "OPTIONS",
          headers: {
            Origin: allowedOrigin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
          },
        });

        expect(res.headers.get("access-control-allow-headers")).toBe(
          "Authorization,Content-Type,Tus-Resumable,Upload-Length,Upload-Metadata,Upload-Offset",
        );
      },
    );

    pgTest(
      "should deny every origin when CORS_ORIGINS is empty",
      async ({ db }) => {
        delete process.env.CORS_ORIGINS;
        const client = testClient(createApp(db).app);

        const res = await client.index.$get(undefined, {
          headers: { Origin: allowedOrigin },
        });

        expect(res.headers.get("access-control-allow-origin")).toBeNull();
      },
    );
  });

  describe("rate limiting", () => {
    beforeEach(() => {
      process.env.TRUST_PROXY_HEADERS = "true";
      process.env.CORS_ORIGINS = "http://localhost:3001";
    });

    afterEach(() => {
      delete process.env.TRUST_PROXY_HEADERS;
      delete process.env.CORS_ORIGINS;
      delete process.env.RATE_LIMIT_ENABLED;
    });

    const spend = async (
      fire: () => Response | Promise<Response>,
      times: number,
    ) => {
      for (let i = 0; i < times; i++) {
        expect((await fire()).status).not.toBe(429);
      }
    };

    pgTest("should limit a public read per client IP", async ({ db }) => {
      const app = createApp(db).app;
      const from = (ip: string) =>
        app.request("/samples", { headers: { "X-Real-IP": ip } });

      await spend(() => from("10.0.0.1"), PUBLIC_IP_BUDGET.points);
      expect((await from("10.0.0.1")).status).toBe(429);
      expect((await from("10.0.0.2")).status).toBe(200);
    });

    pgTest(
      "should give map reads their own budget, apart from the public one",
      async ({ db }) => {
        const app = createApp(db).app;
        const get = (path: string, ip: string) =>
          app.request(path, { headers: { "X-Real-IP": ip } });
        const mapFrom = (ip: string) => get("/samples/map", ip);
        const mapListFrom = (ip: string) =>
          get("/samples?viewport=-10,40,10,50", ip);

        await spend(() => get("/samples", "10.0.0.5"), PUBLIC_IP_BUDGET.points);
        expect((await mapFrom("10.0.0.5")).status).not.toBe(429);
        expect((await get("/samples?viewport=x", "10.0.0.5")).status).toBe(429);
        expect(
          (
            await get(
              "/samples/0123456789ABCDEFGHJKMNPQRS?viewport=-10,40,10,50",
              "10.0.0.5",
            )
          ).status,
        ).toBe(429);

        await spend(() => mapFrom("10.0.0.6"), MAP_IP_BUDGET.points - 1);
        await spend(() => mapListFrom("10.0.0.6"), 1);
        expect((await mapFrom("10.0.0.6")).status).toBe(429);
        expect((await get("/samples", "10.0.0.6")).status).toBe(200);
      },
    );

    pgTest.for(["/contact", "/contact/archive"])(
      "should throttle the %s endpoint far below the public budget, per client IP",
      async (path, { db }) => {
        const app = createApp(db).app;
        const contactFrom = (ip: string) =>
          app.request(`/samples/0123456789ABCDEFGHJKMNPQRS${path}`, {
            method: "POST",
            headers: { "X-Real-IP": ip, "content-type": "application/json" },
            body: JSON.stringify({
              name: "Lovelace",
              firstname: "Ada",
              email: "ada@example.org",
              message: "May I study this sample?",
            }),
          });

        await spend(
          () => contactFrom("10.0.0.3"),
          CONTACT_MAIL_IP_BUDGET.points,
        );
        expect((await contactFrom("10.0.0.3")).status).toBe(429);
        expect((await contactFrom("10.0.0.4")).status).not.toBe(429);
        const read = await app.request("/samples", {
          headers: { "X-Real-IP": "10.0.0.3" },
        });
        expect(read.status).toBe(200);
      },
    );

    pgTest(
      "should throttle the service batch on the import template's budget, per client IP",
      async ({ db }) => {
        const app = createApp(db).app;
        const batchFrom = (ip: string) =>
          app.request("/service/samples/batch", {
            method: "POST",
            headers: { "X-Real-IP": ip, "content-type": "application/json" },
            body: "[]",
          });

        await spend(
          () => batchFrom("10.0.0.7"),
          IMPORT_TEMPLATE_USER_BUDGET.points,
        );
        expect((await batchFrom("10.0.0.7")).status).toBe(429);
        expect((await batchFrom("10.0.0.8")).status).not.toBe(429);
        const read = await app.request("/service/samples", {
          headers: { "X-Real-IP": "10.0.0.7" },
        });
        expect(read.status).toBe(200);
      },
    );

    pgTest(
      "should limit an admin route per authenticated user",
      async ({ db }) => {
        const app = createApp(db).app;
        const from = (token: string) =>
          app.request("/admin/currentUser", {
            headers: { Authorization: `Bearer ${token}` },
          });

        await spend(() => from("user-1"), AUTHENTICATED_USER_BUDGET.points);
        expect((await from("user-1")).status).toBe(429);
        expect((await from("user-2")).status).toBe(200);
      },
    );

    pgTest(
      "should charge upload requests to their own budget, never the authenticated one",
      async ({ db }) => {
        const app = createApp(db).app;
        const upload = () =>
          app.request(`/admin/samples/import/uploads/${UNKNOWN_ID}`, {
            method: "HEAD",
            headers: {
              Authorization: "Bearer user-1",
              "Tus-Resumable": "1.0.0",
            },
          });

        await spend(upload, AUTHENTICATED_USER_BUDGET.points + 1);
        const admin = await app.request("/admin/currentUser", {
          headers: { Authorization: "Bearer user-1" },
        });

        expect(admin.status).toBe(200);
      },
    );

    const adminRequest = (
      app: ReturnType<typeof createApp>["app"],
      token: string,
      { path, body }: { path: string; body?: unknown },
    ) =>
      app.request(path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    pgTest.for([
      {
        route: {
          path: `/admin/samples/${UNKNOWN_ID}/deletion-request`,
          body: { reason: "It was destroyed." },
        },
        budget: MAIL_REQUEST_USER_BUDGET,
      },
      {
        route: {
          path: "/admin/samples/import/internal-id-request",
          body: { internalIds: [] },
        },
        budget: MAIL_REQUEST_USER_BUDGET,
      },
      {
        route: { path: "/admin/samples/import-template?rows=0" },
        budget: IMPORT_TEMPLATE_USER_BUDGET,
      },
      {
        route: {
          path: "/admin/samples/export",
          body: { mode: "ids", ids: [] },
        },
        budget: IMPORT_TEMPLATE_USER_BUDGET,
      },
      {
        route: { path: "/admin/samples/import/duplicates", body: {} },
        budget: IMPORT_TEMPLATE_USER_BUDGET,
      },
    ])(
      "should throttle $route.path far below the authenticated budget, per user",
      async ({ route, budget }, { db }) => {
        const app = createApp(db).app;

        await spend(() => adminRequest(app, "user-1", route), budget.points);
        expect((await adminRequest(app, "user-1", route)).status).toBe(429);
        expect((await adminRequest(app, "user-2", route)).status).not.toBe(429);
      },
    );

    pgTest.for([
      { path: "/admin/samples/import", body: {} },
      {
        path: "/admin/samples/import-template/reservation",
        body: { count: 0 },
      },
    ])(
      "should throttle $path on the import template's budget, per user",
      async (route, { db }) => {
        const app = createApp(db).app;
        const template = { path: "/admin/samples/import-template?rows=0" };

        await spend(
          () => adminRequest(app, "user-1", route),
          IMPORT_TEMPLATE_USER_BUDGET.points,
        );
        expect([
          (await adminRequest(app, "user-1", route)).status,
          (await adminRequest(app, "user-1", template)).status,
        ]).toEqual([429, 429]);
        expect((await adminRequest(app, "user-2", route)).status).not.toBe(429);
      },
    );

    pgTest("should let a browser read the 429 headers", async ({ db }) => {
      const app = createApp(db).app;
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
        "Location",
        "Upload-Offset",
        "Upload-Length",
        "Tus-Resumable",
        "Retry-After",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
      ]);
    });

    pgTest("should never limit a CORS preflight", async ({ db }) => {
      const app = createApp(db).app;
      const headers = {
        "X-Real-IP": "10.0.0.1",
        Origin: "http://localhost:3001",
      };

      await spend(
        () => app.request("/samples", { headers }),
        PUBLIC_IP_BUDGET.points,
      );
      const preflight = await app.request("/samples", {
        method: "OPTIONS",
        headers: { ...headers, "Access-Control-Request-Method": "GET" },
      });

      expect(preflight.status).toBe(204);
    });

    pgTest(
      "should reject an unauthenticated admin request before limiting it",
      async ({ db }) => {
        const app = createApp(db).app;

        const statuses = await Promise.all(
          Array.from(
            { length: AUTHENTICATED_USER_BUDGET.points + 1 },
            async () => (await app.request("/admin/samples")).status,
          ),
        );

        expect([...new Set(statuses)]).toEqual([401]);
      },
    );

    pgTest("should never limit the healthcheck", async ({ db }) => {
      const app = createApp(db).app;

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
        const app = createApp(db).app;
        const from = () =>
          app.request("/samples", { headers: { "X-Real-IP": "10.0.0.1" } });

        for (let i = 0; i <= PUBLIC_IP_BUDGET.points; i++) {
          expect((await from()).status).toBe(200);
        }
      },
    );
  });
});
