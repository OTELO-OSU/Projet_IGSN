import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type {
  AdminUser,
  UpdateUser,
} from "@projet-igsn/domain/user/user-validator";

import { canBecomeSuperAdmin } from "@projet-igsn/domain/user/can-become-super-admin";
import { canSetSuperAdmin } from "@projet-igsn/domain/user/can-set-super-admin";

import { m } from "#/paraglide/messages.js";
import { useUserForm } from "#/users/use-user-form.ts";

export function UserSuperAdminField({
  user,
  caller,
}: {
  user: Pick<AdminUser, "id" | "superAdmin">;
  caller: Pick<ModerationScope, "callerId" | "superAdmin">;
}) {
  const form = useUserForm();
  const superAdminHint = (status: UpdateUser["status"]) => {
    if (!canSetSuperAdmin(caller, user.id)) return m.user_super_admin_self();
    if (!user.superAdmin && !canBecomeSuperAdmin(status)) {
      return m.user_super_admin_active_only();
    }
    return null;
  };

  return (
    <form.Subscribe selector={(state) => state.values.status}>
      {(status) => {
        const hint = superAdminHint(status);
        return (
          <>
            <form.AppField name="superAdmin">
              {(field) => (
                <field.SwitchField
                  label={m.user_super_admin()}
                  disabled={hint !== null}
                />
              )}
            </form.AppField>
            {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
          </>
        );
      }}
    </form.Subscribe>
  );
}
