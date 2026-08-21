import type {
  PendingUser,
  UserRepository,
} from "@projet-igsn/domain/user/repository";

import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";

import type { SendMail } from "../mail/send-mail.ts";

import { pendingUsersDigest } from "./pending-users-digest.ts";

const FAILURE = "Could not mail the pending accounts digest";

export async function sendPendingUsersDigest(
  userRepository: Pick<
    UserRepository,
    "listPending" | "listSpaceManagers" | "listSuperAdminEmails"
  >,
  sendMail: SendMail,
  usersUrl: string,
  now: Date = new Date(),
): Promise<void> {
  const mail = async (to: string[], users: PendingUser[]) => {
    try {
      await sendMail({
        to,
        audience: "admin",
        ...(await pendingUsersDigest(users, usersUrl, now)),
      });
    } catch (error: unknown) {
      console.error(FAILURE, error);
    }
  };

  try {
    const pending = await userRepository.listPending();
    if (pending.length === 0) return;

    const recipients = await userRepository.listSuperAdminEmails();
    if (recipients.length > 0) await mail(recipients, pending);

    for (const manager of await userRepository.listSpaceManagers()) {
      const scope = managerScope(manager.id, manager.groups);
      const theirs = pending.filter(
        (user) => userManagementRights(scope, user).status,
      );
      if (theirs.length > 0) await mail([manager.email], theirs);
    }
  } catch (error: unknown) {
    console.error(FAILURE, error);
  }
}
