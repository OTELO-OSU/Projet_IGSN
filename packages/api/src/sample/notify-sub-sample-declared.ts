import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { SampleCollaborator } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { User } from "@projet-igsn/domain/user/model";

import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { canReceiveMail } from "@projet-igsn/domain/user/can-receive-mail";

import type { SendMail } from "../mail/send-mail.ts";

import { trySendMail } from "../mail/try-send-mail.ts";
import { withinMailBudget } from "../rate-limit/mail-budget.ts";
import { subSampleDeclaredMail } from "./sub-sample-declared-mail.ts";

const FAILURE = "Could not mail the declared sub-sample";

type SubSampleDeclaration = {
  userSamples: Pick<UserSampleRepository, "listCollaborators">;
  mail?: { sendMail: SendMail; adminUrl: string };
  declarer: Pick<User, "id" | "email" | "name" | "firstname">;
  subSample: Pick<Sample, "id" | "name">;
  parents: Pick<Sample, "id" | "name">[];
};

async function mailParentOwners({
  userSamples,
  mail,
  declarer,
  subSample,
  parents,
}: SubSampleDeclaration & {
  mail: { sendMail: SendMail; adminUrl: string };
}): Promise<void> {
  const notified = new Map<
    string,
    { owner: SampleCollaborator; parentNames: string[] }
  >();
  const resolved = await Promise.allSettled(
    parents.map(async (parent) => ({
      parent,
      collaborators: await userSamples.listCollaborators(parent.id),
    })),
  );
  for (const result of resolved) {
    if (result.status === "rejected") {
      console.error(FAILURE, result.reason);
      continue;
    }
    const { parent, collaborators } = result.value;
    const owner = collaborators.find((collaborator) =>
      isSampleOwner(collaborator.role),
    );
    if (!owner || owner.id === declarer.id || !canReceiveMail(owner)) {
      continue;
    }
    const already = notified.get(owner.id);
    if (already) {
      already.parentNames.push(parent.name);
    } else {
      notified.set(owner.id, { owner, parentNames: [parent.name] });
    }
  }
  const subSampleUrl = new URL(
    `samples/${subSample.id}`,
    mail.adminUrl,
  ).toString();
  for (const { owner, parentNames } of notified.values()) {
    if (!(await withinMailBudget(declarer.id))) {
      console.error(FAILURE, "declarer over the mail budget");
      return;
    }
    await trySendMail(
      owner.email,
      () =>
        subSampleDeclaredMail({
          owner,
          declarer,
          subSampleName: subSample.name,
          parentNames,
          subSampleUrl,
        }),
      mail.sendMail,
      FAILURE,
    );
  }
}

export function notifySubSampleDeclared(
  declaration: SubSampleDeclaration,
): void {
  const { mail, parents } = declaration;
  if (!mail || parents.length === 0) {
    return;
  }
  // ponytail: fire and forget; a retry queue if a lost notification ever matters.
  void mailParentOwners({ ...declaration, mail }).catch((error: unknown) =>
    console.error(FAILURE, error),
  );
}
