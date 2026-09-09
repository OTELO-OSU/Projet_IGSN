import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type {
  ApiKeyResponse,
  MyServiceAccountsResponse,
  RequestableInstitutionalGroupsResponse,
  ServiceAccountDraft,
} from "@projet-igsn/domain/service-account/service-account-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { requestableInstitutionalGroups } from "@projet-igsn/domain/service-account/requestable-institutional-groups";
import { MANAGED_GROUP_KINDS } from "@projet-igsn/domain/user/managed-groups";
import { userIdentitySchema } from "@projet-igsn/domain/user/user-validator";
import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireAcceptedUser } from "../auth/require-accepted-user.ts";
import { notifySuperAdmins } from "../mail/notify-super-admins.ts";
import { hasUnattachable } from "../manual-group/has-unattachable.ts";
import { generateApiKey, hashApiKey } from "./api-key.ts";
import { serviceAccountRequestMail } from "./service-account-request-mail.ts";
import {
  validateServiceAccountIdParam,
  validateServiceAccountRequestBody,
} from "./validator.ts";

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
    .get("/requestable-groups", async (c) => {
      const requester = c.get("user");
      const body: RequestableInstitutionalGroupsResponse = {
        data: requestableInstitutionalGroups(
          requester.institutionalLaboratory,
          await users.getModerationScope(requester.id),
        ),
      };
      return c.json(body);
    })
    .post(
      "/requests",
      requireActiveSession,
      validateServiceAccountRequestBody,
      async (c) => {
        const { name, managedGroups, reason } = c.req.valid("json");
        const requester = c.get("user");
        const wanted = managedGroups.manualGroupIds;
        const groups =
          wanted.length > 0
            ? (await manualGroups.listAttachableForUser(requester.id)).filter(
                (group) => wanted.includes(group.id),
              )
            : [];
        if (groups.length !== wanted.length) {
          return c.json({ error: "Manual group not attachable" }, 422);
        }
        const requestable = requestableInstitutionalGroups(
          requester.institutionalLaboratory,
          await users.getModerationScope(requester.id),
        );
        if (
          MANAGED_GROUP_KINDS.some(([kind]) =>
            hasUnattachable(managedGroups[kind], requestable[kind]),
          )
        ) {
          return c.json({ error: "Institutional group out of reach" }, 422);
        }
        const draft: ServiceAccountDraft = {
          name,
          managedGroups,
          institutionalOrganization: requester.institutionalOrganization,
          institutionalOsu: requester.institutionalOsu,
          institutionalLaboratory: requester.institutionalLaboratory,
          owner: userIdentitySchema.parse(requester),
        };
        if (mail) {
          // ponytail: fire and forget; a retry queue if a lost request ever matters.
          void notifySuperAdmins(
            users,
            () =>
              serviceAccountRequestMail({
                requester,
                draft,
                reason,
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
