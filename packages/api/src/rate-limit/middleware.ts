import type { Context, MiddlewareHandler } from "hono";

import { getConnInfo } from "@hono/node-server/conninfo";
import { createMiddleware } from "hono/factory";
import { isIPv4, isIPv6 } from "node:net";
import { RateLimiterRes } from "rate-limiter-flexible";

import type { KeycloakClaims } from "../auth/middleware.ts";
import type { RateLimitConfig, RateLimitScope } from "./config.ts";

import { AUTHENTICATED_USER_BUDGET, PUBLIC_IP_BUDGET } from "./config.ts";
import { createRateLimiter } from "./limiter.ts";

export type RateLimitEnv = { Variables: { jwtPayload: KeycloakClaims } };

const BUDGET = {
  ip: PUBLIC_IP_BUDGET,
  user: AUTHENTICATED_USER_BUDGET,
};

function clientKey(address: string): string {
  if (!isIPv6(address)) return address;
  const ipv4 = address.replace(/^::ffff:/i, "");
  if (isIPv4(ipv4)) return ipv4;
  const [head = "", tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  return `${[...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right].slice(0, 4).join(":")}::/64`;
}

function requestKey(
  c: Context<RateLimitEnv>,
  scope: RateLimitScope,
  trustProxyHeaders: boolean,
): string {
  if (scope === "user") return c.get("jwtPayload")?.sub ?? "unknown";
  const forwarded = trustProxyHeaders ? c.req.header("X-Real-IP") : undefined;
  const address =
    forwarded ?? (c.env ? getConnInfo(c).remote.address : undefined);
  return address === undefined ? "unknown" : clientKey(address);
}

export function rateLimit(
  config: RateLimitConfig,
  scope: RateLimitScope,
  budget: { points: number; duration: number } = BUDGET[scope],
): MiddlewareHandler<RateLimitEnv> {
  if (!config.enabled) {
    return createMiddleware<RateLimitEnv>((_c, next) => next());
  }

  const limiter = createRateLimiter(budget);

  return createMiddleware<RateLimitEnv>(async (c, next) => {
    try {
      await limiter.consume(requestKey(c, scope, config.trustProxyHeaders));
    } catch (rejected) {
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
