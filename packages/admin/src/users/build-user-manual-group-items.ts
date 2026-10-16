import type { AdminUser } from "@projet-igsn/domain/user/user-validator";

import { canManageManualGroup } from "@projet-igsn/domain/user/can-manage-manual-group";

type ManualGroupItem = { value: string; label: string };

const toItem = (group: { id: string; name: string }) => ({
  value: group.id,
  label: group.name,
});

export function buildUserManualGroupItems(
  caller: { superAdmin: boolean; managedManualGroupIds: string[] },
  memberGroups: AdminUser["manualGroups"],
  attachableGroups: { id: string; name: string }[],
): {
  memberItems: ManualGroupItem[];
  groupItems: ManualGroupItem[];
  lockedGroupIds: string[];
} {
  const memberItems = memberGroups.map(toItem);
  const memberIds = new Set(memberItems.map((item) => item.value));
  const groupItems = [
    ...memberItems,
    ...attachableGroups
      .map(toItem)
      .filter((item) => !memberIds.has(item.value)),
  ];
  const lockedGroupIds = memberGroups
    .filter(
      (group) => !group.canDetach || !canManageManualGroup(caller, group.id),
    )
    .map((group) => group.id);
  return { memberItems, groupItems, lockedGroupIds };
}
