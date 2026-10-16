import type { AdminUser } from "@projet-igsn/domain/user/user-validator";

import { settableUserStatuses } from "@projet-igsn/domain/user/settable-user-statuses";
import { shouldRePendOnInstitutionsUpdate } from "@projet-igsn/domain/user/should-re-pend-on-institutions-update";

import { m } from "#/paraglide/messages.js";
import { useUserForm } from "#/users/use-user-form.ts";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";
import { userStatusLabel } from "#/users/user-status-label.ts";

export function UserStatusField({
  user,
  disabled,
}: {
  user: Pick<AdminUser, "status" | "institutionalOrganization" | "superAdmin">;
  disabled: boolean;
}) {
  const form = useUserForm();
  const statusItems = settableUserStatuses(user.status).map((status) => ({
    value: status,
    label: userStatusLabel(status),
    display: <UserStatusBadge status={status} />,
  }));

  const statusField = (
    <form.AppField name="status">
      {(field) => (
        <field.ComboboxField
          label={m.column_status()}
          clearable={false}
          disabled={disabled}
          items={statusItems}
          placeholder={m.user_status_placeholder()}
          searchPlaceholder={m.user_status_placeholder()}
          emptyText={m.user_status_empty()}
        />
      )}
    </form.AppField>
  );
  const rePendNotice = (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{m.column_status()}</span>
      <div>
        <UserStatusBadge status="pending" />
      </div>
      <p className="text-muted-foreground text-sm">{m.user_status_repends()}</p>
    </div>
  );

  return (
    <form.Subscribe
      selector={(state) => state.values.institutionalOrganization ?? null}
    >
      {(organization) =>
        shouldRePendOnInstitutionsUpdate(user, organization)
          ? rePendNotice
          : statusField
      }
    </form.Subscribe>
  );
}
