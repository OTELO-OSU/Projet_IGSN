import type { Context, MiddlewareHandler } from "hono";

import { getConnInfo } from "@hono/node-server/conninfo";
import { createMiddleware } from "hono/factory";
import { matchedRoutes } from "hono/route";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

import type { KeycloakClaims } from "../auth/middleware.ts";
import type { RateLimitConfig } from "./config.ts";
import type { RateLimitScope } from "./route-budgets.ts";

type RateLimitEnv = { Variables: { jwtPayload: KeycloakClaims } };

// The key must come from the trust boundary, never from the client: a header is
// only read when a reverse proxy we control sets it (trustProxyHeaders),
// otherwise anyone rotating X-Real-IP would get an unlimited budget.
function requestKey(
  c: Context<RateLimitEnv>,
  scope: RateLimitScope,
  trustProxyHeaders: boolean,
): string {
  if (scope === "user") return c.get("jwtPayload")?.sub ?? "unknown";
  const forwarded = trustProxyHeaders ? c.req.header("X-Real-IP") : undefined;
  // A proxy that forgets header_up X-Real-IP would otherwise collapse every
  // caller behind it into one shared bucket, so the peer address still answers.
  // c.env is undefined under hono/testing, where getConnInfo would throw.
  return (
    forwarded ??
    (c.env ? getConnInfo(c).remote.address : undefined) ??
    "unknown"
  );
}

export function rateLimit(
  { trustProxyHeaders, routes }: RateLimitConfig,
  scope: RateLimitScope,
): MiddlewareHandler<RateLimitEnv> {
  // ponytail: in-process counters, one replica only; RateLimiterRedis when the
  // api scales out.
  const limiters = new Map(
    routes
      .filter((route) => route.scope === scope)
      .map(({ method, path, points, duration }) => [
        `${method} ${path}`,
        new RateLimiterMemory({ points, duration }),
      ]),
  );

  return createMiddleware<RateLimitEnv>(async (c, next) => {
    // ponytail: `.at(-1)` is the last matching handler in registration order,
    // which is the real route handler only while every `.use()` is registered
    // before the routes it covers, as app.ts does. c.req.routePath cannot be
    // used here: inside a `.use("*")` it resolves to the middleware's own path.
    const matched = matchedRoutes(c).at(-1);
    const limiter =
      matched && limiters.get(`${matched.method} ${matched.path}`);
    if (!limiter) return next();

    try {
      await limiter.consume(requestKey(c, scope, trustProxyHeaders));
    } catch (rejected) {
      // consume() rejects with a RateLimiterRes, which is not an Error, so
      // anything else is a real failure and must not read as a 429.
      if (!(rejected instanceof RateLimiterRes)) throw rejected;
      const seconds = String(Math.ceil(rejected.msBeforeNext / 1000));
      return c.json({ error: "Too many requests" }, 429, {
        "Retry-After": seconds,
        "RateLimit-Limit": String(limiter.points),
        "RateLimit-Remaining": String(rejected.remainingPoints),
        "RateLimit-Reset": seconds,
      });
    }
    return next();
  });
}
