import type { AdminUser } from "@projet-igsn/domain/user/user-validator";

import { fullName } from "@projet-igsn/domain/user/full-name";

import { ConfirmButton } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";
import { useUserForm } from "#/users/use-user-form.ts";

export function UserSaveButton({
  user,
  isPending,
}: {
  user: Pick<AdminUser, "superAdmin" | "firstname" | "name" | "email">;
  isPending: boolean;
}) {
  const form = useUserForm();
  return (
    <form.Subscribe selector={(state) => state.values.superAdmin}>
      {(superAdmin) =>
        superAdmin === user.superAdmin ? (
          <form.SubmitButton label={m.action_save()} disabled={isPending} />
        ) : (
          <ConfirmButton
            title={
              superAdmin
                ? m.user_super_admin_grant_title()
                : m.user_super_admin_revoke_title()
            }
            description={(superAdmin
              ? m.user_super_admin_grant_description
              : m.user_super_admin_revoke_description)({
              name: fullName(user) || user.email,
            })}
            disabled={isPending}
            onConfirm={() => void form.handleSubmit()}
          >
            {m.action_save()}
          </ConfirmButton>
        )
      }
    </form.Subscribe>
  );
}
