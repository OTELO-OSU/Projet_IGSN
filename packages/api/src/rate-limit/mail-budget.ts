import { MAIL_REQUEST_USER_BUDGET, loadRateLimitConfig } from "./config.ts";
import { createRateLimiter } from "./limiter.ts";

const limiter = loadRateLimitConfig().enabled
  ? createRateLimiter(MAIL_REQUEST_USER_BUDGET)
  : null;

export async function withinMailBudget(userId: string): Promise<boolean> {
  if (!limiter) {
    return true;
  }
  try {
    await limiter.consume(userId);
    return true;
  } catch {
    return false;
  }
}
