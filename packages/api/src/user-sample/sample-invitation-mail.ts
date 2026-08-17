import type { CollaboratorRole } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

export type SampleInvitation = {
  invitee: Pick<User, "email" | "name" | "firstname">;
  inviter: Pick<User, "email" | "name" | "firstname">;
  role: CollaboratorRole;
  sampleName: string;
  sampleUrl: string;
};

export async function sampleInvitationMail({
  invitee,
  inviter,
  role,
  sampleName,
  sampleUrl,
}: SampleInvitation): Promise<RenderedMail> {
  const t = translator();
  const params = {
    inviter: fullName(inviter) || inviter.email,
    sample: sampleName,
  };
  return ctaMail({
    recipient: invitee,
    subject: t("mail_invitation_subject", params),
    body: t(`mail_invitation_body_${role}`, params),
    cta: t("mail_invitation_cta"),
    url: sampleUrl,
  });
}
