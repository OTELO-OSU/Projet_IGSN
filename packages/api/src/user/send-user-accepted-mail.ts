import type { User } from "@projet-igsn/domain/user/model";

import type { SendMail } from "../mail/send-mail.ts";

import { userAcceptedMail } from "./user-accepted-mail.ts";

export async function sendUserAcceptedMail(
  user: Pick<User, "email" | "name" | "firstname">,
  sendMail: SendMail,
  adminUrl: string,
): Promise<void> {
  try {
    await sendMail({
      to: [user.email],
      ...(await userAcceptedMail(user, adminUrl)),
    });
  } catch (error: unknown) {
    console.error("Could not mail the accepted user", error);
  }
}
