import type { RateLimiterAbstract } from "rate-limiter-flexible";

import { RateLimiterMemory } from "rate-limiter-flexible";

// ponytail: in-process counters, one replica only; swap RateLimiterMemory for
// RateLimiterRedis here, the single place the api builds one, when it scales out.
export function createRateLimiter(budget: {
  points: number;
  duration: number;
}): RateLimiterAbstract {
  return new RateLimiterMemory(budget);
}
