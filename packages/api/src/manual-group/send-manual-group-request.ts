import type { UserRepository } from "@projet-igsn/domain/user/repository";

import type { SendMail } from "../mail/send-mail.ts";
import type { ManualGroupRequest } from "./manual-group-request-mail.ts";

import { manualGroupRequestMail } from "./manual-group-request-mail.ts";

const FAILURE = "Could not mail the manual group creation request";

export async function sendManualGroupRequest(
  users: Pick<UserRepository, "listSuperAdminEmails">,
  request: Omit<ManualGroupRequest, "adminUrl">,
  mail: { sendMail: SendMail; adminUrl: string },
): Promise<void> {
  try {
    const to = await users.listSuperAdminEmails();
    if (to.length === 0) {
      console.error(FAILURE, "no super admin to notify");
      return;
    }
    await mail.sendMail({
      to,
      audience: "admin",
      ...(await manualGroupRequestMail({
        ...request,
        adminUrl: mail.adminUrl,
      })),
    });
  } catch (error: unknown) {
    console.error(FAILURE, error);
  }
}
