import { HttpResponse, http } from "msw";

import { CALLER_GROUPS } from "./caller-groups.ts";
import { worker } from "./msw.ts";

export const fakeCurrentUser = (overrides: Record<string, unknown> = {}) =>
  worker.use(
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        sub: "s",
        name: "Marie Dupont",
        orcid: null,
        status: "accepted",
        superAdmin: false,
        ...CALLER_GROUPS,
        ...overrides,
      }),
    ),
  );
