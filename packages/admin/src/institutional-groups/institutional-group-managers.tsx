import type { InstitutionalGroupRef } from "@projet-igsn/domain/institutional-group/model";

import { ManagersSection } from "#/managers/managers-section.tsx";

import { useAddInstitutionalGroupManager } from "./use-add-institutional-group-manager.ts";
import { useInstitutionalGroupManagers } from "./use-institutional-group-managers.ts";
import { useRemoveInstitutionalGroupManager } from "./use-remove-institutional-group-manager.ts";

export function InstitutionalGroupManagers({
  kind,
  code,
}: InstitutionalGroupRef) {
  const query = useInstitutionalGroupManagers({ kind, code });
  const addManager = useAddInstitutionalGroupManager();
  const removeManager = useRemoveInstitutionalGroupManager();

  return (
    <ManagersSection
      managers={query.data ?? []}
      isPending={query.isPending}
      isError={query.isError}
      onAdd={(userId) => addManager.mutate({ kind, code, userId })}
      onRemove={(userId) => removeManager.mutate({ kind, code, userId })}
    />
  );
}
