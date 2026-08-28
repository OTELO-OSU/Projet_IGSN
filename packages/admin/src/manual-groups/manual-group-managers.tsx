import { ManagersSection } from "#/managers/managers-section.tsx";

import { useAddManualGroupManager } from "./use-add-manual-group-manager.ts";
import { useManualGroupManagers } from "./use-manual-group-managers.ts";
import { useRemoveManualGroupManager } from "./use-remove-manual-group-manager.ts";

export function ManualGroupManagers({ groupId }: { groupId: string }) {
  const query = useManualGroupManagers(groupId);
  const addManager = useAddManualGroupManager();
  const removeManager = useRemoveManualGroupManager();

  return (
    <ManagersSection
      managers={query.data ?? []}
      isPending={query.isPending}
      isError={query.isError}
      onAdd={(userId) => addManager.mutate({ groupId, userId })}
      onRemove={(userId) => removeManager.mutate({ groupId, userId })}
    />
  );
}
