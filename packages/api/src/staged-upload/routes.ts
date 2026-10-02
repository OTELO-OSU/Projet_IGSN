import type { Server } from "@tus/server";
import type { Context } from "hono";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { OWNER_HEADER } from "./tus-server.ts";

export function createStagedUploadRoutes(tusServer: Server) {
  const delegate = (c: Context<AuthenticatedEnv>) => {
    const headers = new Headers(c.req.raw.headers);
    headers.set(OWNER_HEADER, c.get("user").id);
    return tusServer.handleWeb(new Request(c.req.raw, { headers }));
  };
  return new Hono<AuthenticatedEnv>().all("*", delegate);
}
