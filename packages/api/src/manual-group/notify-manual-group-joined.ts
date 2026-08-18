import type { User } from "@projet-igsn/domain/user/model";

import type { SendMail } from "../mail/send-mail.ts";

import { trySendMail } from "../mail/try-send-mail.ts";
import { manualGroupInvitationMail } from "./manual-group-invitation-mail.ts";

type Party = Pick<User, "email" | "firstname" | "id" | "name">;

export function logMembershipChange(
  actor: string,
  group: string,
  target: string,
) {
  console.info("manual group membership changed", { actor, group, target });
}

export function notifyManualGroupJoined({
  actor,
  invitee,
  groups,
  mail,
}: {
  actor: Party;
  invitee: Party;
  groups: { id: string; name: string }[];
  mail?: { sendMail: SendMail; adminUrl: string };
}): void {
  for (const group of groups) {
    logMembershipChange(actor.id, group.id, invitee.id);
  }
  if (!mail || groups.length === 0) {
    return;
  }
  // ponytail: fire and forget; a retry queue if a lost notification ever matters.
  void trySendMail(
    invitee.email,
    () =>
      manualGroupInvitationMail({
        invitee,
        inviter: actor,
        groupNames: groups.map((group) => group.name),
        settingsUrl: new URL("/settings", mail.adminUrl).toString(),
      }),
    mail.sendMail,
    "Could not mail the manual group invitation",
  );
}
