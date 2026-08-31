import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";

export type SampleDeletionRequest = {
  requester: Pick<User, "email" | "name" | "firstname">;
  sample: Pick<Sample, "id" | "name" | "igsn">;
  reason: string;
  adminUrl: string;
};

export async function sampleDeletionRequestMail({
  requester,
  sample,
  reason,
  adminUrl,
}: SampleDeletionRequest): Promise<RenderedMail> {
  const t = translator();
  const params = {
    requester: fullName(requester) || requester.email,
    sample: sample.name,
    igsn: sample.igsn ?? "",
  };
  return ctaMail({
    recipient: { name: null, firstname: null },
    subject: t("mail_sample_deletion_request_subject", params),
    body: t("mail_sample_deletion_request_body", params),
    quote: reason,
    cta: t("mail_sample_deletion_request_cta"),
    url: new URL(`samples/${sample.id}`, adminUrl).toString(),
  });
}
