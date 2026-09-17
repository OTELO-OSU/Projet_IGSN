import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type Requester = Pick<User, "email" | "name" | "firstname">;

type ManualGroupRequest = {
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
  const url = new URL("manual-groups", adminUrl);
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
  return ctaMailFor("manual_group_request", {
    recipient: { name: null, firstname: null },
    params: {
      requester: fullName(requester) || requester.email,
      name,
      managers: managers.map(withEmail).join(", "),
    },
    url: requestUrl(
      adminUrl,
      name,
      managers.map((manager) => manager.id),
    ),
  });
}
