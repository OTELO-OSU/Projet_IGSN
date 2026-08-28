import { z } from "zod";

export type RateLimitScope = "ip" | "user";

export const PUBLIC_IP_BUDGET = { points: 50, duration: 60 } as const;
export const AUTHENTICATED_USER_BUDGET = { points: 100, duration: 60 } as const;
export const CONTACT_MAIL_IP_BUDGET = { points: 5, duration: 3600 } as const;
export const MAIL_REQUEST_USER_BUDGET = {
  points: 5,
  duration: 3600,
} as const;

export type RateLimitConfig = {
  enabled: boolean;
  trustProxyHeaders: boolean;
};

const flagSchema = (name: string, fallback: boolean) =>
  z.stringbool({ error: `${name} must be a boolean` }).default(fallback);

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
  };
}
