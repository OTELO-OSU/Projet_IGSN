import type { SampleAdditionalRole } from "@projet-igsn/domain/sample/additional-role/model";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function replaceSampleAdditionalRoles(
  db: Transactional<DB>,
  sampleId: string,
  roles: SampleAdditionalRole[],
): Promise<void> {
  await db
    .deleteFrom("sample_additional_role")
    .where("sample_id", "=", sampleId)
    .execute();
  if (roles.length === 0) return;
  await db
    .insertInto("sample_additional_role")
    .values(
      roles.map(({ role, personUserId, personFirstname, personLastname }) => ({
        id: uuidv7(),
        sample_id: sampleId,
        role,
        person_user_id: personUserId ?? null,
        person_firstname: personFirstname ?? null,
        person_lastname: personLastname ?? null,
      })),
    )
    .execute();
}

export function additionalRolesOf(input: CreateSample): SampleAdditionalRole[] {
  return input.scientificContext?.provenanceStatus === "field_sample"
    ? input.scientificContext.additionalRoles
    : [];
}
