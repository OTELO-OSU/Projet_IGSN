import { z } from "zod";

import type { RateLimitRoute } from "./route-budgets.ts";

import { RATE_LIMIT_ROUTES } from "./route-budgets.ts";

export type RateLimitConfig = {
  trustProxyHeaders: boolean;
  routes: RateLimitRoute[];
};

// Malformed values throw rather than falling back: a deploy typo must surface at
// boot instead of silently serving a budget nobody chose.
const flagSchema = (name: string, fallback: boolean) =>
  z.stringbool({ error: `${name} must be a boolean` }).default(fallback);

const budgetSchema = (name: string, fallback: number) => {
  const error = `${name} must be a positive integer`;
  return z.coerce
    .number({ error })
    .int(error)
    .positive(error)
    .default(fallback);
};

// `|| undefined` rather than the raw value: docker-compose expands an unset
// ${VAR} to "", and z.coerce turns "" into 0. Empty must mean unset.
export function loadRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitConfig {
  const enabled = flagSchema("RATE_LIMIT_ENABLED", true).parse(
    env.RATE_LIMIT_ENABLED || undefined,
  );
  return {
    trustProxyHeaders: flagSchema("TRUST_PROXY_HEADERS", false).parse(
      env.TRUST_PROXY_HEADERS || undefined,
    ),
    routes: enabled
      ? RATE_LIMIT_ROUTES.map((route) => {
          const points = `RATE_LIMIT_${route.key}_POINTS`;
          const duration = `RATE_LIMIT_${route.key}_DURATION`;
          return {
            ...route,
            points: budgetSchema(points, route.points).parse(
              env[points] || undefined,
            ),
            duration: budgetSchema(duration, route.duration).parse(
              env[duration] || undefined,
            ),
          };
        })
      : [],
  };
}
