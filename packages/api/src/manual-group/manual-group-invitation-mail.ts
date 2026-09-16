import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type ManualGroupInvitation = {
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
  return ctaMailFor("manual_group_invitation", {
    recipient: invitee,
    params: {
      inviter: fullName(inviter) || inviter.email,
      groups: groupNames.map((name) => `"${name}"`).join(", "),
      count: groupNames.length,
    },
    url: settingsUrl,
  });
}
