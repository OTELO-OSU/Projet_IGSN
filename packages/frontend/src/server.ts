import handler from "@tanstack/react-start/server-entry";

import { runWithClientIp } from "./client-ip.ts";
import { paraglideMiddleware } from "./paraglide/server.js";

// paraglideMiddleware resolves the locale (url > cookie > Accept-Language >
// baseLocale) and redirects bare `/` to the prefixed URL. Pass the original
// `req`, not the callback's `request`: TanStack Router already delocalizes via
// the router `rewrite`, and delocalizing twice causes a redirect loop.
export default {
  fetch(req: Request): Promise<Response> {
    // Hold the visitor address for the whole render so api calls made server-side
    // carry it (X-Real-IP), instead of all sharing this container's own budget.
    return runWithClientIp(req.headers.get("x-real-ip") ?? undefined, () =>
      paraglideMiddleware(req, () => handler.fetch(req)),
    );
  },
};
