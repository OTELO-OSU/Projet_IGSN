import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type SampleRemoval = {
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
  return ctaMailFor("removal", {
    recipient: removed,
    params: {
      remover: fullName(remover) || remover.email,
      sample: sampleName,
    },
    url,
  });
}
