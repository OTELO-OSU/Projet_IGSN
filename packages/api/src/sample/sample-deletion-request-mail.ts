import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type SampleDeletionRequest = {
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
  return ctaMailFor("sample_deletion_request", {
    recipient: { name: null, firstname: null },
    params: {
      requester: fullName(requester) || requester.email,
      sample: sample.name,
      igsn: sample.igsn ?? "",
    },
    quote: reason,
    url: new URL(`samples/${sample.id}`, adminUrl).toString(),
  });
}
