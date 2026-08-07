import type { UserRepository } from "@projet-igsn/domain/user/repository";

import type { SendMail } from "../mail/send-mail.ts";

import { pendingUsersDigest } from "./pending-users-digest.ts";

export async function sendPendingUsersDigest(
  userRepository: Pick<UserRepository, "listPending" | "listSuperAdminEmails">,
  sendMail: SendMail,
  usersUrl: string,
  now: Date = new Date(),
): Promise<void> {
  try {
    const pending = await userRepository.listPending();
    if (pending.length === 0) return;

    const recipients = await userRepository.listSuperAdminEmails();
    if (recipients.length === 0) return;

    await sendMail({
      to: recipients,
      ...(await pendingUsersDigest(pending, usersUrl, now)),
    });
  } catch (error: unknown) {
    console.error("Could not mail the pending accounts digest", error);
  }
}
