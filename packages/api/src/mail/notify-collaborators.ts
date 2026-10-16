import type { SampleCollaborator } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { MailKind } from "@projet-igsn/domain/user/mail-kind";

import { canReceiveMail } from "@projet-igsn/domain/user/can-receive-mail";

import type { RenderedMail, SendMail } from "./send-mail.ts";

import { trySendMail } from "./try-send-mail.ts";

export async function notifyCollaborators(
  kind: MailKind,
  collaborators: (SampleCollaborator & { mailOptOuts: MailKind[] })[],
  actorId: string | undefined,
  render: (recipient: SampleCollaborator) => Promise<RenderedMail>,
  sendMail: SendMail,
  failure: string,
): Promise<void> {
  await Promise.all(
    collaborators
      .filter(
        (collaborator) =>
          collaborator.id !== actorId && canReceiveMail(collaborator, kind),
      )
      .map((recipient) =>
        trySendMail(
          recipient.email,
          () => render(recipient),
          sendMail,
          failure,
        ),
      ),
  );
}
