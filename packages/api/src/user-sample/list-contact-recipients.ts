import type { ContactSample } from "@projet-igsn/domain/user-sample/repository";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

type InstitutionalGroup = {
  kind: DB["user_managed_institutional_group"]["kind"];
  code: string;
};

function institutionalGroups(sample: ContactSample): InstitutionalGroup[] {
  return (
    [
      { kind: "organization", code: sample.institutionalOrganization },
      { kind: "osu", code: sample.institutionalOsu },
      { kind: "laboratory", code: sample.institutionalLaboratory },
    ] as const
  ).flatMap(({ kind, code }) => (code === null ? [] : [{ kind, code }]));
}

async function contactableOwner(
  db: Transactional<DB>,
  sample: ContactSample,
  groups: InstitutionalGroup[],
): Promise<string | null> {
  const owner = await db
    .selectFrom("user_sample")
    .innerJoin("user", "user.id", "user_sample.user_id")
    .select((eb) => [
      "user.email",
      "user.institutional_organization",
      "user.institutional_osu",
      "user.institutional_laboratory",
      eb
        .exists(
          eb
            .selectFrom("manual_group_member")
            .innerJoin(
              "sample_manual_group",
              "sample_manual_group.group_id",
              "manual_group_member.group_id",
            )
            .select("manual_group_member.group_id")
            .whereRef("manual_group_member.user_id", "=", "user_sample.user_id")
            .where("sample_manual_group.sample_id", "=", sample.id),
        )
        .as("inManualGroup"),
    ])
    .where("user_sample.sample_id", "=", sample.id)
    .where("user_sample.role", "=", "owner")
    .where("user.status", "=", "accepted")
    .executeTakeFirst();
  if (!owner) return null;
  const ownerCode = {
    organization: owner.institutional_organization,
    osu: owner.institutional_osu,
    laboratory: owner.institutional_laboratory,
  };
  const inInstitutionalGroup = groups.some(
    ({ kind, code }) => ownerCode[kind] === code,
  );
  return owner.inManualGroup || inInstitutionalGroup ? owner.email : null;
}

export async function listContactRecipients(
  db: Transactional<DB>,
  sample: ContactSample,
): Promise<string[]> {
  const groups = institutionalGroups(sample);
  const owner = await contactableOwner(db, sample, groups);
  if (owner) return [owner];

  const groupIds = sample.manualGroups.map(({ id }) => id);
  if (groupIds.length > 0) {
    const managers = await db
      .selectFrom("user_managed_manual_group")
      .innerJoin("user", "user.id", "user_managed_manual_group.user_id")
      .select("user.email")
      .distinct()
      .where("user_managed_manual_group.group_id", "in", groupIds)
      .where("user.status", "=", "accepted")
      .orderBy("user.email")
      .execute();
    if (managers.length > 0) return managers.map(({ email }) => email);
  }

  if (groups.length === 0) return [];
  const managers = await db
    .selectFrom("user_managed_institutional_group")
    .innerJoin("user", "user.id", "user_managed_institutional_group.user_id")
    .select("user.email")
    .distinct()
    .where((eb) =>
      eb.or(
        groups.map(({ kind, code }) =>
          eb.and([
            eb("user_managed_institutional_group.kind", "=", kind),
            eb("user_managed_institutional_group.code", "=", code),
          ]),
        ),
      ),
    )
    .where("user.status", "=", "accepted")
    .orderBy("user.email")
    .execute();
  return managers.map(({ email }) => email);
}
