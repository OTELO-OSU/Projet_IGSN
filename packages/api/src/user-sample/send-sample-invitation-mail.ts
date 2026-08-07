import type { SendMail } from "../mail/send-mail.ts";
import type { SampleInvitation } from "./sample-invitation-mail.ts";

import { sampleInvitationMail } from "./sample-invitation-mail.ts";

export async function sendSampleInvitationMail(
  invitation: SampleInvitation,
  sendMail: SendMail,
): Promise<void> {
  try {
    await sendMail({
      to: [invitation.invitee.email],
      ...(await sampleInvitationMail(invitation)),
    });
  } catch (error: unknown) {
    console.error("Could not mail the sample invitation", error);
  }
}
