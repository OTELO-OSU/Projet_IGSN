import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useId, useState } from "react";

import { frontendSearchUrl } from "#/frontend-url.ts";
import { useMyManualGroups } from "#/manual-groups/use-my-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { ShareLink } from "#/settings/share-link.tsx";

export function GroupSamplesLink() {
  const id = useId();
  const query = useMyManualGroups();
  const groups = query.data?.data ?? [];
  const [groupId, setGroupId] = useState("");

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Label htmlFor={id} className="shrink-0">
          {m.settings_group_samples_group()}
        </Label>
        <div className="min-w-0 flex-1">
          <Combobox
            id={id}
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
          label={m.settings_group_samples_link()}
          link={frontendSearchUrl({ manualGroup: groupId })}
        />
      )}
    </>
  );
}
