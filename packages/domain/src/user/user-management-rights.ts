export type UserManagementRights = {
  status: boolean;
  institutions: boolean;
  manualGroups: boolean;
  managedGroups: boolean;
};

export function userManagementRights(
  caller: { superAdmin: boolean; managedLaboratories: string[] },
  target: { institutionalLaboratory: string | null },
): UserManagementRights {
  const institutions =
    caller.superAdmin ||
    (target.institutionalLaboratory !== null &&
      caller.managedLaboratories.includes(target.institutionalLaboratory));
  return {
    status: institutions,
    institutions,
    manualGroups: caller.superAdmin,
    managedGroups: caller.superAdmin,
  };
}
