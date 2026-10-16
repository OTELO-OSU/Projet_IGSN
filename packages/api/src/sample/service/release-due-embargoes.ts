import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";

import type { SendMail } from "../../mail/send-mail.ts";

import { notifyPublication } from "../notify-publication.ts";

// ponytail: single-replica ceiling, claim the row with FOR UPDATE SKIP LOCKED if the api ever scales past one replica.
export async function releaseDueEmbargoes(
  {
    samples,
    userSamples,
  }: { samples: SampleRepository; userSamples: UserSampleRepository },
  mail: { sendMail: SendMail; adminUrl: string },
  now: Date = new Date(),
): Promise<void> {
  for (const id of await samples.listDueEmbargoes(now)) {
    try {
      const released = await samples.setStatus(id, { status: "published" });
      if (!released) continue;
      await notifyPublication({
        event: "embargo_ended",
        userSamples,
        sample: released,
        mail,
      });
    } catch (error: unknown) {
      console.error("Could not release the embargo", { id, error });
    }
  }
}
