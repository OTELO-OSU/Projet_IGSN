import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type ContactSampleOwner = {
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
  return ctaMailFor("contact", {
    recipient: { name: null, firstname: null },
    params: {
      visitor: fullName(visitor),
      email: visitor.email,
      sample: sampleName,
      igsn,
    },
    quote: visitor.message,
    url: new URL(`samples/${igsn}`, frontendUrl).toString(),
  });
}
