import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import type { SendMail } from "../mail/send-mail.ts";

import { groupWithoutManagerMail } from "./group-without-manager-mail.ts";

const FAILURE = "Could not mail the groups left without active manager";

export async function sendGroupsWithoutManagerMail(
  users: Pick<UserRepository, "listSuperAdminEmails">,
  groups: OrphanedGroup[],
  mail: { sendMail: SendMail; adminUrl: string },
): Promise<void> {
  try {
    const to = await users.listSuperAdminEmails();
    if (to.length === 0) {
      console.error(FAILURE, "no super admin to notify");
      return;
    }
    // ponytail: one mail per orphaned group; a single listing mail if a manager ever holds many groups.
    for (const group of groups) {
      await mail.sendMail({
        to,
        audience: "admin",
        ...(await groupWithoutManagerMail(group, mail.adminUrl)),
      });
    }
  } catch (error: unknown) {
    console.error(FAILURE, error);
  }
}
