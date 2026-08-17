import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";

import { m } from "#/paraglide/messages.js";

import { useLeaveManualGroup } from "./use-leave-manual-group.ts";
import { useMyManualGroups } from "./use-my-manual-groups.ts";

export function MyManualGroups() {
  const query = useMyManualGroups();
  const leaveGroup = useLeaveManualGroup();

  if (query.isPending) return <p>{m.manual_groups_loading()}</p>;
  if (query.isError) return <p role="alert">{m.manual_groups_error()}</p>;

  const { data: groups, meta } = query.data;
  if (groups.length === 0) return <p>{m.settings_manual_groups_empty()}</p>;

  return (
    <>
      <ul className="grid w-full max-w-md gap-2">
        {groups.map((group) => (
          <li
            key={group.id}
            className="flex items-center justify-between gap-4"
          >
            <span>{group.name}</span>
            <ConfirmButton
              variant="outline"
              size="sm"
              disabled={!meta.canLeave}
              aria-label={m.manual_group_leave_group({ name: group.name })}
              title={m.manual_group_leave_title()}
              description={m.manual_group_leave_description({
                name: group.name,
              })}
              confirmLabel={m.manual_group_leave_action()}
              cancelLabel={m.action_cancel()}
              closeLabel={m.action_close()}
              onConfirm={() => leaveGroup.mutate(group.id)}
            >
              {m.manual_group_leave_action()}
            </ConfirmButton>
          </li>
        ))}
      </ul>
      {!meta.canLeave && (
        <p className="text-muted-foreground text-sm">
          {m.manual_group_leave_locked()}
        </p>
      )}
    </>
  );
}
