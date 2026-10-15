import type { UserStatus } from "@projet-igsn/domain/user/model";

import type { DB } from "../db.ts";

import { storedInstitutions } from "../institutional-group/stored-institution.ts";
import { type Transactional } from "../transaction.ts";

export function insertUser(
  db: Transactional<DB>,
  email: string,
  overrides: {
    id?: string;
    name?: string | null;
    firstname?: string | null;
    orcid?: string | null;
    status?: UserStatus;
    superAdmin?: boolean;
    createdAt?: Date;
    institutionalOrganization?: string;
    institutionalOsu?: string;
    institutionalLaboratory?: string;
    charterAcceptedAt?: Date | null;
  } = {},
): Promise<{ id: string }> {
  const stored = storedInstitutions({
    institutionalOsu: overrides.institutionalOsu ?? null,
    institutionalLaboratory: overrides.institutionalLaboratory ?? null,
  });
  return db
    .insertInto("user")
    .values({
      id: overrides.id ?? crypto.randomUUID(),
      email,
      name: overrides.name ?? null,
      firstname: overrides.firstname ?? null,
      orcid: overrides.orcid,
      status: overrides.status ?? "accepted",
      super_admin: overrides.superAdmin,
      created_at: overrides.createdAt,
      institutional_organization: overrides.institutionalOrganization ?? null,
      institutional_osu: stored.institutionalOsu,
      institutional_laboratory: stored.institutionalLaboratory,
      charter_accepted_at:
        overrides.charterAcceptedAt === undefined
          ? new Date()
          : overrides.charterAcceptedAt,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
}
