import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";

import { settableUserStatuses } from "@projet-igsn/domain/user/settable-user-statuses";
import { shouldRePendOnInstitutionsUpdate } from "@projet-igsn/domain/user/should-re-pend-on-institutions-update";
import { HTTPException } from "hono/http-exception";

export type UserStatusAndInstitutions = {
  status: UserStatus;
  institutionalOrganization: string | null;
  institutionalOsu: string | null;
  institutionalLaboratory: string | null;
};

export function updateUserStatusAndInstitutions(
  submitted: UpdateUser,
  stored: UserStatusAndInstitutions & { superAdmin: boolean },
  rights: UserManagementRights,
): UserStatusAndInstitutions {
  const submittedStatus = rights.status ? submitted.status : stored.status;
  if (!settableUserStatuses(stored.status).includes(submittedStatus)) {
    throw new HTTPException(422, { message: "Invalid status" });
  }
  const institutions = rights.institutions ? submitted : stored;
  return {
    status: shouldRePendOnInstitutionsUpdate(
      stored,
      institutions.institutionalOrganization,
    )
      ? "pending"
      : submittedStatus,
    institutionalOrganization: institutions.institutionalOrganization,
    institutionalOsu: institutions.institutionalOsu,
    institutionalLaboratory: institutions.institutionalLaboratory,
  };
}
