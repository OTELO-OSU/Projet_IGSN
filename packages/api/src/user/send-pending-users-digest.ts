import type { InstitutionalGroupRepository } from "@projet-igsn/domain/institutional-group/repository";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";
import type {
  PendingUser,
  UserRepository,
} from "@projet-igsn/domain/user/repository";

import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";

import type { SendMail } from "../mail/send-mail.ts";
import type { DigestUrls } from "./pending-users-digest.ts";

import { institutionalGroupLabel } from "../institutional-group/institutional-group-label.ts";
import { pendingUsersDigest } from "./pending-users-digest.ts";

const FAILURE = "Could not mail the pending accounts digest";

export type DigestRepositories = {
  users: Pick<
    UserRepository,
    "listPending" | "listSpaceManagers" | "listSuperAdminEmails"
  >;
  manualGroups: Pick<ManualGroupRepository, "listWithoutActiveManager">;
  institutionalGroups: Pick<
    InstitutionalGroupRepository,
    "listWithoutActiveManager"
  >;
};

export async function sendPendingUsersDigest(
  { users, manualGroups, institutionalGroups }: DigestRepositories,
  sendMail: SendMail,
  urls: DigestUrls,
  now: Date = new Date(),
): Promise<void> {
  const mail = async (
    to: string[],
    pending: PendingUser[],
    orphanGroups: OrphanedGroup[],
  ) => {
    try {
      await sendMail({
        to,
        audience: "admin",
        ...(await pendingUsersDigest(pending, orphanGroups, urls, now)),
      });
    } catch (error: unknown) {
      console.error(FAILURE, error);
    }
  };

  try {
    const pending = await users.listPending();
    const orphanGroups: OrphanedGroup[] = [
      ...(await manualGroups.listWithoutActiveManager()).map(
        ({ id, name }): OrphanedGroup => ({ kind: "manual", id, name }),
      ),
      ...(await institutionalGroups.listWithoutActiveManager()).map(
        (ref): OrphanedGroup => ({
          ...ref,
          name: institutionalGroupLabel(ref),
        }),
      ),
    ];
    if (pending.length === 0 && orphanGroups.length === 0) return;

    const recipients = await users.listSuperAdminEmails();
    if (recipients.length > 0) await mail(recipients, pending, orphanGroups);

    for (const manager of await users.listSpaceManagers()) {
      const scope = managerScope(manager.id, manager.groups);
      const theirs = pending.filter(
        (user) => userManagementRights(scope, user).status,
      );
      if (theirs.length > 0) await mail([manager.email], theirs, []);
    }
  } catch (error: unknown) {
    console.error(FAILURE, error);
  }
}
