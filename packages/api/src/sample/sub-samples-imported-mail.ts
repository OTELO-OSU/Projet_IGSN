import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type SubSamplesImport = {
  owner: Pick<User, "name" | "firstname">;
  declarer: Pick<User, "email" | "name" | "firstname">;
  count: number;
  parentNames: string[];
  adminUrl: string;
};

export async function subSamplesImportedMail({
  owner,
  declarer,
  count,
  parentNames,
  adminUrl,
}: SubSamplesImport): Promise<RenderedMail> {
  return ctaMailFor("sub_samples_imported", {
    recipient: owner,
    params: {
      declarer: fullName(declarer) || declarer.email,
      parents: parentNames.map((name) => `"${name}"`).join(", "),
      count,
    },
    url: new URL("samples", adminUrl).toString(),
  });
}
