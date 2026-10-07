import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { User } from "@projet-igsn/domain/user/model";

import { canReceiveMail } from "@projet-igsn/domain/user/can-receive-mail";
import { z } from "zod";

import type { SendMail } from "../mail/send-mail.ts";

import { trySendMail } from "../mail/try-send-mail.ts";
import { type EmbargoEvent, sampleEmbargoMail } from "./sample-embargo-mail.ts";

const FAILURE = "Could not mail the sample embargo";

export async function notifyEmbargo({
  event,
  userSamples,
  sample,
  actor,
  mail,
}: {
  event: EmbargoEvent;
  userSamples: Pick<UserSampleRepository, "listCollaborators">;
  sample: Pick<Sample, "id" | "name" | "publishedAt">;
  actor?: Pick<User, "id" | "email" | "name" | "firstname">;
  mail: { sendMail: SendMail; adminUrl: string };
}): Promise<void> {
  try {
    const publishedAt = z.date().parse(sample.publishedAt);
    const url = new URL(`samples/${sample.id}`, mail.adminUrl).toString();
    const collaborators = await userSamples.listCollaborators(sample.id);
    await Promise.all(
      collaborators
        .filter(
          (collaborator) =>
            collaborator.id !== actor?.id && canReceiveMail(collaborator),
        )
        .map((recipient) =>
          trySendMail(
            recipient.email,
            () =>
              sampleEmbargoMail({
                event,
                recipient,
                actor,
                sampleName: sample.name,
                publishedAt,
                url,
              }),
            mail.sendMail,
            FAILURE,
          ),
        ),
    );
  } catch (error: unknown) {
    console.error(FAILURE, error);
  }
}
