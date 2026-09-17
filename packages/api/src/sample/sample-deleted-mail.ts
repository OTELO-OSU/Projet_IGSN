import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type SampleDeleted = {
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
  return ctaMailFor("sample_deleted", {
    recipient,
    params: {
      deleter: fullName(deleter) || deleter.email,
      sample: sampleName,
    },
    url,
  });
}
