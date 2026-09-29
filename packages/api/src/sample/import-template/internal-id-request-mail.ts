import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../../mail/send-mail.ts";

import { ctaMailFor } from "../../mail/cta-mail.ts";

type InternalIdRequest = {
  requester: Pick<User, "id" | "email" | "name" | "firstname">;
  internalIds: string[];
  adminUrl: string;
};

export async function internalIdRequestMail({
  requester,
  internalIds,
  adminUrl,
}: InternalIdRequest): Promise<RenderedMail> {
  const mail = await ctaMailFor("internal_id_request", {
    recipient: { name: null, firstname: null },
    params: {
      requester: fullName(requester) || requester.email,
      email: requester.email,
    },
    quote: internalIds.join(", "),
    url: new URL(`users/${requester.id}`, adminUrl).toString(),
  });
  return { ...mail, replyTo: requester.email };
}
