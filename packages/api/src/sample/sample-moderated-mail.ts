import type { SampleMailField } from "@projet-igsn/domain/sample/changed-sample-fields";
import type { User } from "@projet-igsn/domain/user/model";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

type SampleModeratedEdit = {
  owner: Pick<User, "email" | "name" | "firstname">;
  fields: SampleMailField[];
  sampleName: string;
  sampleUrl: string;
};

export async function sampleModeratedMail({
  owner,
  fields,
  sampleName,
  sampleUrl,
}: SampleModeratedEdit): Promise<RenderedMail> {
  const t = translator();
  const params = {
    sample: sampleName,
    fields: fields.map((field) => t(`mail_sample_field_${field}`)).join(", "),
  };
  return ctaMail({
    recipient: owner,
    subject: t("mail_sample_moderated_subject", params),
    body: t("mail_sample_moderated_body", params),
    cta: t("mail_sample_moderated_cta"),
    url: sampleUrl,
  });
}
