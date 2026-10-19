import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";

export function mergeManagedGroups<Member extends ManualGroup>(
  memberGroups: Member[],
  managedGroups: ManualGroup[],
): (Member | ManualGroup)[] {
  return [
    ...memberGroups,
    ...managedGroups.filter(
      (managed) => !memberGroups.some((group) => group.id === managed.id),
    ),
  ].toSorted((a, b) => a.name.localeCompare(b.name));
}
