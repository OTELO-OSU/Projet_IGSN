import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

export type SampleRemoval = {
  removed: Pick<User, "email" | "name" | "firstname">;
  remover: Pick<User, "email" | "name" | "firstname">;
  sampleName: string;
  url: string;
};

export async function sampleRemovalMail({
  removed,
  remover,
  sampleName,
  url,
}: SampleRemoval): Promise<RenderedMail> {
  const t = translator();
  const params = {
    remover: fullName(remover) || remover.email,
    sample: sampleName,
  };
  return ctaMail({
    recipient: removed,
    subject: t("mail_removal_subject", params),
    body: t("mail_removal_body", params),
    cta: t("mail_removal_cta"),
    url,
  });
}
