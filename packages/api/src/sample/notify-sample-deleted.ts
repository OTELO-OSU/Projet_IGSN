import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { SampleCollaborator } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { User } from "@projet-igsn/domain/user/model";

import type { SendMail } from "../mail/send-mail.ts";

import { trySendMail } from "../mail/try-send-mail.ts";
import { sampleDeletedMail } from "./sample-deleted-mail.ts";

const FAILURE = "Could not mail the sample deletion";

export async function notifySampleDeleted({
  collaborators,
  deleter,
  sample,
  mail,
}: {
  collaborators: SampleCollaborator[];
  deleter: Pick<User, "id" | "email" | "name" | "firstname">;
  sample: Pick<Sample, "name">;
  mail: { sendMail: SendMail; adminUrl: string };
}): Promise<void> {
  try {
    await Promise.all(
      collaborators
        .filter((collaborator) => collaborator.id !== deleter.id)
        .map((recipient) =>
          trySendMail(
            recipient.email,
            () =>
              sampleDeletedMail({
                recipient,
                deleter,
                sampleName: sample.name,
                url: mail.adminUrl,
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
