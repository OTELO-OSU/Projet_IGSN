export function canManageManualGroup(
  caller: { superAdmin: boolean; managedManualGroupIds: string[] },
  groupId: string,
): boolean {
  return caller.superAdmin || caller.managedManualGroupIds.includes(groupId);
}
