import type { User } from "@projet-igsn/domain/user/model";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

export async function userAcceptedMail(
  user: Pick<User, "name" | "firstname">,
  adminUrl: string,
): Promise<RenderedMail> {
  return ctaMailFor("account_approved", { recipient: user, url: adminUrl });
}
