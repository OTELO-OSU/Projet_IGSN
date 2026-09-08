import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type {
  ApiKeyResponse,
  MyServiceAccountsResponse,
  ServiceAccountDraft,
} from "@projet-igsn/domain/service-account/service-account-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "../auth/current-user.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { notifySuperAdmins } from "../mail/notify-super-admins.ts";
import { generateApiKey, hashApiKey } from "./api-key.ts";
import { serviceAccountRequestMail } from "./service-account-request-mail.ts";
import {
  validateServiceAccountIdParam,
  validateServiceAccountRequestBody,
} from "./validator.ts";

const requireAcceptedUser = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    if (c.get("user").status !== "accepted") {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  },
);

export function createServiceAccountOwnerRoutes(
  serviceAccounts: ServiceAccountRepository,
  users: UserRepository,
  manualGroups: ManualGroupRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  return new Hono<AuthenticatedEnv>()
    .use("*", requireAcceptedUser)
    .get("/", async (c) => {
      const body: MyServiceAccountsResponse = {
        data: await serviceAccounts.listByOwner(c.get("user").id),
      };
      return c.json(body);
    })
    .post(
      "/requests",
      requireActiveSession,
      validateServiceAccountRequestBody,
      async (c) => {
        const { name, managedGroups } = c.req.valid("json");
        const wanted = [...new Set(managedGroups.manualGroupIds)];
        const groups = await manualGroups.listByIds(wanted);
        if (groups.length !== wanted.length) {
          return c.json({ error: "Manual group not found" }, 404);
        }
        const requester = c.get("user");
        const draft: ServiceAccountDraft = {
          name,
          managedGroups,
          institutionalOrganization: requester.institutionalOrganization,
          institutionalOsu: requester.institutionalOsu,
          institutionalLaboratory: requester.institutionalLaboratory,
          owner: {
            id: requester.id,
            email: requester.email,
            name: requester.name,
            firstname: requester.firstname,
            orcid: requester.orcid,
          },
        };
        if (mail) {
          // ponytail: fire and forget; a retry queue if a lost request ever matters.
          void notifySuperAdmins(
            users,
            () =>
              serviceAccountRequestMail({
                requester,
                draft,
                manualGroupNames: groups.map((group) => group.name),
                adminUrl: mail.adminUrl,
              }),
            mail.sendMail,
            "Could not mail the service account request",
          );
        }
        return c.body(null, 204);
      },
    )
    .post(
      "/:id/api-key",
      requireActiveSession,
      validateServiceAccountIdParam,
      async (c) => {
        const { id } = c.req.valid("param");
        const actor = c.get("user").id;
        const apiKey = generateApiKey();
        await serviceAccounts.rotateApiKey(id, actor, hashApiKey(apiKey));
        console.info("service account api key rotated", {
          actor,
          account: id,
        });
        const body: ApiKeyResponse = { apiKey };
        return c.json(body);
      },
    );
}
