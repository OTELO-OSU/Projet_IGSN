import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "./paraglide/server.js";

// paraglideMiddleware resolves the locale (url > cookie > Accept-Language >
// baseLocale) and redirects bare `/` to the prefixed URL. Pass the original
// `req`, not the callback's `request`: TanStack Router already delocalizes via
// the router `rewrite`, and delocalizing twice causes a redirect loop.
export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req));
  },
};
