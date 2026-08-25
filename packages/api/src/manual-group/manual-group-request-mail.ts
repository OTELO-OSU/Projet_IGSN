import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

type Requester = Pick<User, "email" | "name" | "firstname">;

export type ManualGroupRequest = {
  requester: Requester;
  name: string;
  managers: (Requester & Pick<User, "id">)[];
  adminUrl: string;
};

const withEmail = (user: Requester) => {
  const named = fullName(user);
  return named ? `${named} (${user.email})` : user.email;
};

function requestUrl(
  adminUrl: string,
  name: string,
  managerIds: string[],
): string {
  const url = new URL("/manual-groups", adminUrl);
  url.searchParams.set("requestedName", name);
  url.searchParams.set("requestedManagerIds", managerIds.join(","));
  return url.toString();
}

export async function manualGroupRequestMail({
  requester,
  name,
  managers,
  adminUrl,
}: ManualGroupRequest): Promise<RenderedMail> {
  const t = translator();
  const params = {
    requester: fullName(requester) || requester.email,
    name,
    managers: managers.map(withEmail).join(", "),
  };
  return ctaMail({
    recipient: { name: null, firstname: null },
    subject: t("mail_manual_group_request_subject", params),
    body: t("mail_manual_group_request_body", params),
    cta: t("mail_manual_group_request_cta"),
    url: requestUrl(
      adminUrl,
      name,
      managers.map((manager) => manager.id),
    ),
  });
}
