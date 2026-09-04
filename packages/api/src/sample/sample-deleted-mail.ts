import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

export type SampleDeleted = {
  recipient: Pick<User, "email" | "name" | "firstname">;
  deleter: Pick<User, "email" | "name" | "firstname">;
  sampleName: string;
  url: string;
};

export async function sampleDeletedMail({
  recipient,
  deleter,
  sampleName,
  url,
}: SampleDeleted): Promise<RenderedMail> {
  const t = translator();
  const params = {
    deleter: fullName(deleter) || deleter.email,
    sample: sampleName,
  };
  return ctaMail({
    recipient,
    subject: t("mail_sample_deleted_subject", params),
    body: t("mail_sample_deleted_body", params),
    cta: t("mail_sample_deleted_cta"),
    url,
  });
}
