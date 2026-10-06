import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";

import { ConfirmButton } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";

import { useLeaveManualGroup } from "./use-leave-manual-group.ts";
import { useMyManualGroups } from "./use-my-manual-groups.ts";

export function MyManualGroups() {
  const query = useMyManualGroups();
  const leaveGroup = useLeaveManualGroup();

  if (query.isPending) return null;
  if (query.isError)
    return (
      <FormSection title={m.settings_manual_groups_title()}>
        <p role="alert">{m.manual_groups_error()}</p>
      </FormSection>
    );

  const { data: groups } = query.data;
  if (groups.length === 0) return null;

  return (
    <FormSection title={m.settings_manual_groups_title()}>
      <ul className="grid w-full max-w-md gap-2">
        {groups.map((group) => {
          const leaveButton = (
            <ConfirmButton
              variant="outline"
              size="sm"
              disabled={!group.canLeave}
              aria-label={m.manual_group_leave_group({ name: group.name })}
              title={m.manual_group_leave_title()}
              description={m.manual_group_leave_description({
                name: group.name,
              })}
              confirmLabel={m.manual_group_leave_action()}
              onConfirm={() => leaveGroup.mutate(group.id)}
            >
              {m.manual_group_leave_action()}
            </ConfirmButton>
          );
          return (
            <li
              key={group.id}
              className="flex items-center justify-between gap-4"
            >
              <span>{group.name}</span>
              {group.canLeave ? (
                leaveButton
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>{leaveButton}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{m.manual_group_leave_locked()}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </li>
          );
        })}
      </ul>
    </FormSection>
  );
}
