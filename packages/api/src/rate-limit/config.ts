import { z } from "zod";

export type RateLimitScope = "ip" | "user";

export const PUBLIC_IP_BUDGET = { points: 50, duration: 60 } as const;
export const MAP_IP_BUDGET = { points: 300, duration: 60 } as const;
export const AUTHENTICATED_USER_BUDGET = { points: 100, duration: 60 } as const;
export const CONTACT_MAIL_IP_BUDGET = { points: 5, duration: 3600 } as const;
export const MAIL_REQUEST_USER_BUDGET = {
  points: 5,
  duration: 3600,
} as const;
export const IMPORT_TEMPLATE_USER_BUDGET = { points: 5, duration: 60 } as const;
// ponytail: ~2 requests per document, so the 2500-id import cap (~5000 requests) still throttles; raise or pace client-side if a real import hits it.
export const UPLOAD_USER_BUDGET = { points: 600, duration: 60 } as const;

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
