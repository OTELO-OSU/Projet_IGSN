import { z } from "zod";

export function adminAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  return z.url().parse(env.ADMIN_URL);
}
