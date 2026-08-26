import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

import { HttpResponse, http } from "msw";

import { CALLER_GROUPS } from "./caller-groups.ts";
import { worker } from "./msw.ts";

export const fakeCurrentUser = (overrides: Partial<CurrentUser> = {}) =>
  worker.use(
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        id: "3f2504e0-4f89-41d3-9a0c-0305000000f1",
        sub: "s",
        name: "Marie Dupont",
        orcid: null,
        status: "accepted",
        superAdmin: false,
        managedLaboratories: [],
        managedManualGroups: [],
        ...CALLER_GROUPS,
        ...overrides,
      }),
    ),
  );
