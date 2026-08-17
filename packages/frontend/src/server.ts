import handler from "@tanstack/react-start/server-entry";

import { runWithClientIp } from "./client-ip.ts";
import { paraglideMiddleware } from "./paraglide/server.js";

export default {
  fetch(req: Request): Promise<Response> {
    return runWithClientIp(req.headers.get("x-real-ip") ?? undefined, () =>
      paraglideMiddleware(req, () => handler.fetch(req)),
    );
  },
};
