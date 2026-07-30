import { Hono } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { KeycloakClaims } from "../auth/middleware.ts";
import type { RateLimitConfig } from "./config.ts";

import { rateLimit } from "./middleware.ts";

const config = (overrides: Partial<RateLimitConfig> = {}): RateLimitConfig => ({
  enabled: true,
  trustProxyHeaders: false,
  ip: { points: 2, duration: 60 },
  user: { points: 2, duration: 60 },
  ...overrides,
});

const publicApp = (rateLimitConfig: RateLimitConfig) =>
  new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .get("/samples", (c) => c.json({ ok: true }));

// The user scope reads the sub the auth guard leaves behind, so the stub runs
// first, as requireAuth does in app.ts.
const adminApp = (rateLimitConfig: RateLimitConfig) =>
  new Hono<{ Variables: { jwtPayload: KeycloakClaims } }>()
    .use("*", async (c, next) => {
      const sub = c.req.header("Authorization")?.replace("Bearer ", "");
      if (sub) c.set("jwtPayload", { sub });
      await next();
    })
    .use("*", rateLimit(rateLimitConfig, "user"))
    .get("/admin/samples", (c) => c.json({ ok: true }));

// The node adapter reads the peer address off the request socket, so a fake env
// of that shape is what a real connection looks like to getConnInfo.
const fromPeer = (
  app: ReturnType<typeof publicApp>,
  remoteAddress: string,
  headers?: Record<string, string>,
) =>
  app.fetch(new Request("http://localhost/samples", { headers }), {
    incoming: { socket: { remoteAddress, remoteFamily: "IPv4" } },
  });

const limitHeaders = (res: Response) => ({
  "retry-after": res.headers.get("retry-after"),
  "ratelimit-limit": res.headers.get("ratelimit-limit"),
  "ratelimit-remaining": res.headers.get("ratelimit-remaining"),
  "ratelimit-reset": res.headers.get("ratelimit-reset"),
});

describe("rateLimit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should serve the budget then refuse with 429 and the limit headers", async () => {
    const app = publicApp(config({ ip: { points: 2, duration: 60 } }));

    expect((await app.request("/samples")).status).toBe(200);
    expect((await app.request("/samples")).status).toBe(200);
    const refused = await app.request("/samples");

    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ error: "Too many requests" });
    expect(limitHeaders(refused)).toEqual({
      "retry-after": "60",
      "ratelimit-limit": "2",
      "ratelimit-remaining": "0",
      "ratelimit-reset": "60",
    });
  });

  it("should leave the limit headers off an accepted response", async () => {
    const app = publicApp(config());

    expect(limitHeaders(await app.request("/samples"))).toEqual({
      "retry-after": null,
      "ratelimit-limit": null,
      "ratelimit-remaining": null,
      "ratelimit-reset": null,
    });
  });

  it("should count each client IP against its own budget", async () => {
    const app = publicApp(
      config({ trustProxyHeaders: true, ip: { points: 1, duration: 60 } }),
    );
    const from = (ip: string) =>
      app.request("/samples", { headers: { "X-Real-IP": ip } });

    expect((await from("10.0.0.1")).status).toBe(200);
    expect((await from("10.0.0.2")).status).toBe(200);
    expect((await from("10.0.0.1")).status).toBe(429);
  });

  it("should ignore a forged X-Real-IP when proxy headers are untrusted", async () => {
    const app = publicApp(config({ ip: { points: 1, duration: 60 } }));
    const forging = (ip: string) =>
      fromPeer(app, "10.0.0.1", { "X-Real-IP": ip });

    expect((await forging("203.0.113.1")).status).toBe(200);
    expect((await forging("203.0.113.2")).status).toBe(429);
    expect((await fromPeer(app, "10.0.0.2")).status).toBe(200);
  });

  // A proxy site edited without header_up X-Real-IP would otherwise turn the
  // per-visitor budget into a single shared one for everyone behind it.
  it("should fall back to the peer address when a trusted proxy sends no X-Real-IP", async () => {
    const app = publicApp(
      config({ trustProxyHeaders: true, ip: { points: 1, duration: 60 } }),
    );

    expect((await fromPeer(app, "10.0.0.1")).status).toBe(200);
    expect((await fromPeer(app, "10.0.0.2")).status).toBe(200);
    expect((await fromPeer(app, "10.0.0.1")).status).toBe(429);
  });

  it("should count each authenticated user against its own budget", async () => {
    const app = adminApp(config({ user: { points: 1, duration: 60 } }));
    const from = (sub: string) =>
      app.request("/admin/samples", {
        headers: { Authorization: `Bearer ${sub}` },
      });

    expect((await from("user-1")).status).toBe(200);
    expect((await from("user-1")).status).toBe(429);
    expect((await from("user-2")).status).toBe(200);
  });

  it("should refuse nothing when the limiter is disabled", async () => {
    const app = publicApp(
      config({ enabled: false, ip: { points: 1, duration: 60 } }),
    );

    const first = await app.request("/samples");
    expect(first.status).toBe(200);
    expect((await app.request("/samples")).status).toBe(200);
    expect(limitHeaders(first)).toEqual({
      "retry-after": null,
      "ratelimit-limit": null,
      "ratelimit-remaining": null,
      "ratelimit-reset": null,
    });
  });

  it("should propagate a store failure instead of reporting it as a 429", async () => {
    vi.spyOn(RateLimiterMemory.prototype, "consume").mockRejectedValue(
      new Error("limiter store unreachable"),
    );
    const app = publicApp(config());

    expect((await app.request("/samples")).status).toBe(500);
  });
});
