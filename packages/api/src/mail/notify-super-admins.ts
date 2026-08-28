import type { UserRepository } from "@projet-igsn/domain/user/repository";

import type { RenderedMail, SendMail } from "./send-mail.ts";

export async function notifySuperAdmins(
  users: Pick<UserRepository, "listSuperAdminEmails">,
  render: () => Promise<RenderedMail>,
  sendMail: SendMail,
  failure: string,
): Promise<void> {
  try {
    const to = await users.listSuperAdminEmails();
    if (to.length === 0) {
      console.error(failure, "no super admin to notify");
      return;
    }
    await sendMail({ to, audience: "admin", ...(await render()) });
  } catch (error: unknown) {
    console.error(failure, error);
  }
}
