import { z } from "zod";

export function adminUsersUrl(env: NodeJS.ProcessEnv = process.env): string {
  return new URL("/users", z.url().parse(env.ADMIN_URL)).toString();
}
