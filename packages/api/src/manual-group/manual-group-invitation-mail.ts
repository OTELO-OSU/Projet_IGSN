import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

export type ManualGroupInvitation = {
  invitee: Pick<User, "email" | "name" | "firstname">;
  inviter: Pick<User, "email" | "name" | "firstname">;
  groupNames: string[];
  settingsUrl: string;
};

export async function manualGroupInvitationMail({
  invitee,
  inviter,
  groupNames,
  settingsUrl,
}: ManualGroupInvitation): Promise<RenderedMail> {
  const t = translator();
  const params = {
    inviter: fullName(inviter) || inviter.email,
    groups: groupNames.map((name) => `"${name}"`).join(", "),
    count: groupNames.length,
  };
  return ctaMail({
    recipient: invitee,
    subject: t("mail_manual_group_invitation_subject", params),
    body: t("mail_manual_group_invitation_body", params),
    cta: t("mail_manual_group_invitation_cta"),
    url: settingsUrl,
  });
}
