import { z } from "zod";

export type RateLimitScope = "ip" | "user";

export const PUBLIC_IP_BUDGET = { points: 50, duration: 60 } as const; // per client IP
export const AUTHENTICATED_USER_BUDGET = { points: 100, duration: 60 } as const; // per JWT sub

type RateLimitTier = { points: number; duration: number };

export type RateLimitConfig = {
  enabled: boolean;
  trustProxyHeaders: boolean;
  ip: RateLimitTier;
  user: RateLimitTier;
};

// Malformed values throw rather than falling back: a deploy typo must surface at
// boot instead of silently serving the wrong policy.
const flagSchema = (name: string, fallback: boolean) =>
  z.stringbool({ error: `${name} must be a boolean` }).default(fallback);

// `|| undefined` rather than the raw value: docker-compose expands an unset
// ${VAR} to "", and z.stringbool would reject "". Empty must mean unset.
export function loadRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitConfig {
  return {
    enabled: flagSchema("RATE_LIMIT_ENABLED", true).parse(
      env.RATE_LIMIT_ENABLED || undefined,
    ),
    trustProxyHeaders: flagSchema("TRUST_PROXY_HEADERS", false).parse(
      env.TRUST_PROXY_HEADERS || undefined,
    ),
    ip: PUBLIC_IP_BUDGET,
    user: AUTHENTICATED_USER_BUDGET,
  };
}
