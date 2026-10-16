import { canGrantRole } from "@projet-igsn/domain/user-sample/can-grant-role";
import { canManageCollaborators } from "@projet-igsn/domain/user-sample/can-manage-collaborators";
import { sampleCollaboratorsResponseSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { canReceiveMail } from "@projet-igsn/domain/user/can-receive-mail";
import { Hono } from "hono";

import type { SampleAdminDeps, SampleAdminEnv } from "./admin-routes.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { trySendMail } from "../mail/try-send-mail.ts";
import { sampleInvitationMail } from "../user-sample/sample-invitation-mail.ts";
import { sampleRemovalMail } from "../user-sample/sample-removal-mail.ts";
import {
  validateAddCollaboratorBody,
  validateCollaboratorParams,
  validateIdParam,
} from "./validator.ts";

export function createSampleCollaboratorRoutes({
  userSampleRepository,
  mail,
}: SampleAdminDeps) {
  return new Hono<SampleAdminEnv>()
    .get("/:id/collaborators", validateIdParam, async (c) => {
      if (!c.get("sample")) {
        return c.json({ error: "Not found" }, 404);
      }
      const body = sampleCollaboratorsResponseSchema.parse({
        data: await userSampleRepository.listCollaborators(
          c.req.valid("param").id,
        ),
      });
      return c.json(body);
    })
    .post(
      "/:id/collaborators",
      requireActiveSession,
      validateIdParam,
      validateAddCollaboratorBody,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        const id = c.req.valid("param").id;
        const { userId, role } = c.req.valid("json");
        if (!canGrantRole(c.get("shareRole"), role)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const added = await userSampleRepository.addCollaborator(
          id,
          userId,
          role,
          { mayChangeRole: canManageCollaborators(c.get("shareRole")) },
        );
        if (
          mail &&
          added !== "already_collaborator" &&
          canReceiveMail(added.added, "sample_invitation")
        ) {
          // ponytail: fire and forget; a retry queue if a lost invitation ever matters.
          void trySendMail(
            added.added.email,
            () =>
              sampleInvitationMail({
                invitee: added.added,
                inviter: c.get("user"),
                role,
                sampleName: sample.name,
                sampleUrl: new URL(`samples/${id}`, mail.adminUrl).toString(),
              }),
            mail.sendMail,
            "Could not mail the sample invitation",
          );
        }
        return c.body(null, 204);
      },
    )
    .delete(
      "/:id/collaborators/:userId",
      requireActiveSession,
      validateCollaboratorParams,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!canManageCollaborators(c.get("shareRole"))) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const { id, userId } = c.req.valid("param");
        const removed = await userSampleRepository.removeCollaborator(
          id,
          userId,
        );
        if (removed === "not_found") {
          return c.json({ error: "Collaborator not found" }, 404);
        }
        if (mail && canReceiveMail(removed.removed, "sample_removal")) {
          void trySendMail(
            removed.removed.email,
            () =>
              sampleRemovalMail({
                removed: removed.removed,
                remover: c.get("user"),
                sampleName: sample.name,
                url: mail.adminUrl,
              }),
            mail.sendMail,
            "Could not mail the collaborator removal",
          );
        }
        return c.body(null, 204);
      },
    );
}
