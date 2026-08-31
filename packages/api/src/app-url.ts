import { z } from "zod";

export function appUrl(
  key: "ADMIN_URL" | "FRONTEND_URL",
  env: NodeJS.ProcessEnv = process.env,
): string {
  const url = z.url().parse(env[key]);
  return url.endsWith("/") ? url : `${url}/`;
}
