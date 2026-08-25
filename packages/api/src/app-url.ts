import { z } from "zod";

export function appUrl(
  key: "ADMIN_URL" | "FRONTEND_URL",
  env: NodeJS.ProcessEnv = process.env,
): string {
  return z.url().parse(env[key]);
}
