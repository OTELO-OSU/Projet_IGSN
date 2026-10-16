import type { User } from "@projet-igsn/domain/user/model";

import { formatDate } from "@projet-igsn/domain/date/format-date";
import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

type MailUser = Pick<User, "email" | "name" | "firstname">;

export type PublicationEvent =
  | "embargo_started"
  | "embargo_ended"
  | "published"
  | "withdrawn";

type SamplePublication = {
  event: PublicationEvent;
  recipient: MailUser;
  actor?: MailUser;
  sampleName: string;
  publishedAt: Date;
  url: string;
};

export function samplePublicationMail({
  event,
  recipient,
  actor,
  sampleName,
  publishedAt,
  url,
}: SamplePublication): Promise<RenderedMail> {
  return ctaMailFor(`sample_${event}`, {
    recipient,
    params: {
      actor: actor ? fullName(actor) || actor.email : "",
      sample: sampleName,
      date: formatDate(publishedAt),
    },
    url,
  });
}
