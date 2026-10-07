import type { User } from "@projet-igsn/domain/user/model";

import { formatDate } from "@projet-igsn/domain/date/format-date";
import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type MailUser = Pick<User, "email" | "name" | "firstname">;

export type EmbargoEvent = "started" | "ended";

type SampleEmbargo = {
  event: EmbargoEvent;
  recipient: MailUser;
  actor?: MailUser;
  sampleName: string;
  publishedAt: Date;
  url: string;
};

export function sampleEmbargoMail({
  event,
  recipient,
  actor,
  sampleName,
  publishedAt,
  url,
}: SampleEmbargo): Promise<RenderedMail> {
  return ctaMailFor(`sample_embargo_${event}`, {
    recipient,
    params: {
      actor: actor ? fullName(actor) || actor.email : "",
      sample: sampleName,
      date: formatDate(publishedAt),
    },
    url,
  });
}
