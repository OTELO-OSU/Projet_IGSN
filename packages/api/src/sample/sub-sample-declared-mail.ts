import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type SubSampleDeclaration = {
  owner: Pick<User, "email" | "name" | "firstname">;
  declarer: Pick<User, "email" | "name" | "firstname">;
  subSampleName: string;
  parentNames: string[];
  subSampleUrl: string;
};

export async function subSampleDeclaredMail({
  owner,
  declarer,
  subSampleName,
  parentNames,
  subSampleUrl,
}: SubSampleDeclaration): Promise<RenderedMail> {
  return ctaMailFor("sub_sample_declared", {
    recipient: owner,
    params: {
      declarer: fullName(declarer) || declarer.email,
      subSample: subSampleName,
      parents: parentNames.map((name) => `"${name}"`).join(", "),
      count: parentNames.length,
    },
    url: subSampleUrl,
  });
}
