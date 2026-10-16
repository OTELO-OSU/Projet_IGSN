import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";

import type { buildUserManualGroupItems } from "#/users/build-user-manual-group-items.ts";

import { m } from "#/paraglide/messages.js";
import { useUserForm } from "#/users/use-user-form.ts";

export function UserManualGroupsField({
  disabled,
  memberItems,
  groupItems,
  lockedGroupIds,
}: { disabled: boolean } & ReturnType<typeof buildUserManualGroupItems>) {
  const form = useUserForm();
  return (
    <form.Subscribe selector={(state) => state.values.status}>
      {(status) => (
        <>
          <form.AppField name="manualGroupIds">
            {(field) => (
              <field.MultiComboboxField
                label={m.field_user_manual_groups()}
                disabled={disabled}
                lockedValues={lockedGroupIds}
                items={canJoinManualGroup(status) ? groupItems : memberItems}
                placeholder={m.manual_group_placeholder()}
                searchPlaceholder={m.manual_groups_search_placeholder()}
                emptyText={m.manual_groups_empty()}
                removeLabel={(label) =>
                  m.manual_group_detach_member({ name: label })
                }
              />
            )}
          </form.AppField>
          {canJoinManualGroup(status) ? null : (
            <p className="text-muted-foreground text-sm">
              {m.user_manual_groups_locked()}
            </p>
          )}
        </>
      )}
    </form.Subscribe>
  );
}
