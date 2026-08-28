import type { SampleMailField } from "@projet-igsn/domain/sample/changed-sample-fields";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";

import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";

import type { SendMail } from "../mail/send-mail.ts";
import type { PublishStatus } from "./validator.ts";

import { trySendMail } from "../mail/try-send-mail.ts";
import { sampleModeratedMail } from "./sample-moderated-mail.ts";

const FAILURE = "Could not mail the moderated sample edit";

export async function notifySampleModerated({
  userSamples,
  mail,
  sample,
  fields,
}: {
  userSamples: UserSampleRepository;
  mail: { sendMail: SendMail; adminUrl: string };
  sample: Pick<Sample, "id" | "name">;
  fields: PublishStatus | SampleMailField[];
}): Promise<void> {
  try {
    const owner = (await userSamples.listCollaborators(sample.id)).find(
      (collaborator) => isSampleOwner(collaborator.role),
    );
    if (!owner) {
      return;
    }
    await trySendMail(
      owner.email,
      () =>
        sampleModeratedMail({
          owner,
          fields,
          sampleName: sample.name,
          sampleUrl: new URL(`/samples/${sample.id}`, mail.adminUrl).toString(),
        }),
      mail.sendMail,
      FAILURE,
    );
  } catch (error: unknown) {
    console.error(FAILURE, error);
  }
}
