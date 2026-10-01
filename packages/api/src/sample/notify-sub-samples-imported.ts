import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { User } from "@projet-igsn/domain/user/model";

import type { SendMail } from "../mail/send-mail.ts";

import { trySendMail } from "../mail/try-send-mail.ts";
import { withinMailBudget } from "../rate-limit/mail-budget.ts";
import { parentOwners } from "./notify-sub-sample-declared.ts";
import { subSamplesImportedMail } from "./sub-samples-imported-mail.ts";

const FAILURE = "Could not mail the imported sub-samples";

type SubSamplesImport = {
  userSamples: Pick<UserSampleRepository, "listCollaborators">;
  mail?: { sendMail: SendMail; adminUrl: string };
  declarer: Pick<User, "id" | "email" | "name" | "firstname">;
  parents: Pick<Sample, "id" | "name">[];
  parentIds: string[];
};

async function mailParentOwners({
  userSamples,
  mail,
  declarer,
  parents,
  parentIds,
}: SubSamplesImport & {
  mail: { sendMail: SendMail; adminUrl: string };
}): Promise<void> {
  for (const { owner, parents: owned } of await parentOwners(
    userSamples,
    parents,
    declarer.id,
  )) {
    if (!(await withinMailBudget(declarer.id))) {
      console.error(FAILURE, "declarer over the mail budget");
      return;
    }
    const ownedIds = new Set(owned.map((parent) => parent.id));
    await trySendMail(
      owner.email,
      () =>
        subSamplesImportedMail({
          owner,
          declarer,
          count: parentIds.filter((id) => ownedIds.has(id)).length,
          parentNames: owned.map((parent) => parent.name),
          adminUrl: mail.adminUrl,
        }),
      mail.sendMail,
      FAILURE,
    );
  }
}

export function notifySubSamplesImported(imported: SubSamplesImport): void {
  const { mail, parentIds } = imported;
  if (!mail || parentIds.length === 0) {
    return;
  }
  // ponytail: fire and forget; a retry queue if a lost notification ever matters.
  void mailParentOwners({ ...imported, mail }).catch((error: unknown) =>
    console.error(FAILURE, error),
  );
}
