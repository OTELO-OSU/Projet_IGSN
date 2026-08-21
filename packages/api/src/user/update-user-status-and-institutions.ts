import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";

export type UserStatusAndInstitutions = {
  status: UserStatus;
  institutionalOrganization: string | null;
  institutionalOsu: string | null;
  institutionalLaboratory: string | null;
};

export function updateUserStatusAndInstitutions(
  submitted: UpdateUser,
  stored: UserStatusAndInstitutions,
  rights: UserManagementRights,
): UserStatusAndInstitutions {
  const institutions = rights.institutions ? submitted : stored;
  return {
    status: rights.status ? submitted.status : stored.status,
    institutionalOrganization: institutions.institutionalOrganization,
    institutionalOsu: institutions.institutionalOsu,
    institutionalLaboratory: institutions.institutionalLaboratory,
  };
}
