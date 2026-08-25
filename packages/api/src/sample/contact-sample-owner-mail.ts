import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

export type ContactSampleOwner = {
  visitor: ContactSampleOwnerBody;
  sampleName: string;
  igsn: string;
  frontendUrl: string;
};

export async function contactSampleOwnerMail({
  visitor,
  sampleName,
  igsn,
  frontendUrl,
}: ContactSampleOwner): Promise<RenderedMail> {
  const t = translator();
  const params = {
    visitor: fullName(visitor),
    email: visitor.email,
    sample: sampleName,
    igsn,
  };
  return ctaMail({
    recipient: { name: null, firstname: null },
    subject: t("mail_contact_subject", params),
    body: t("mail_contact_body", params),
    quote: visitor.message,
    cta: t("mail_contact_cta"),
    url: new URL(`/samples/${igsn}`, frontendUrl).toString(),
  });
}
