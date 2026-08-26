import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useState } from "react";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { useMyManualGroups } from "#/manual-groups/use-my-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { ShareLink } from "#/settings/share-link.tsx";

export function GroupSamplesLink() {
  const query = useMyManualGroups();
  const groups = query.data?.data ?? [];
  const [groupId, setGroupId] = useState("");

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Label htmlFor="group-samples-group" className="shrink-0">
          {m.settings_group_samples_group()}
        </Label>
        <div className="min-w-0 flex-1">
          <Combobox
            id="group-samples-group"
            items={groups.map((group) => ({
              value: group.id,
              label: group.name,
            }))}
            value={groupId}
            onChange={setGroupId}
            disabled={groups.length === 0}
            placeholder={m.settings_group_samples_placeholder()}
            searchPlaceholder={m.settings_group_samples_search_placeholder()}
            emptyText={m.settings_group_samples_empty()}
          />
        </div>
      </div>
      {groupId && (
        <ShareLink
          id="group-samples-link"
          label={m.settings_group_samples_link()}
          link={`${FRONTEND_URL}/search?manualGroup=${groupId}`}
        />
      )}
    </>
  );
}
