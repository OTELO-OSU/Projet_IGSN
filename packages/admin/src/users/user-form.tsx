import type {
  AdminUser,
  UpdateUser,
} from "@projet-igsn/domain/user/user-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { settableUserStatuses } from "@projet-igsn/domain/user/settable-user-statuses";
import { updateUserSchema } from "@projet-igsn/domain/user/user-validator";

import { institutionalGroupsFieldErrors } from "#/institutional-groups/institutional-groups-field-errors.ts";
import { InstitutionalGroupsFields } from "#/institutional-groups/institutional-groups-fields.tsx";
import { useManualGroups } from "#/manual-groups/use-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";
import { userStatusLabel } from "#/users/user-status-label.ts";

// ponytail: one page of 50 groups, server-side search once the catalog outgrows it
const CATALOG_PAGE = { page: 1, perPage: 50, search: "" };

export function UserForm({
  user,
  save,
}: {
  user: AdminUser;
  save: { mutate: (user: UpdateUser) => void; isPending: boolean };
}) {
  const catalog = useManualGroups(CATALOG_PAGE);
  const form = useAppForm({
    defaultValues: {
      status: user.status,
      institutionalOrganization: user.institutionalOrganization,
      institutionalOsu: user.institutionalOsu,
      institutionalLaboratory: user.institutionalLaboratory,
      manualGroupIds: user.manualGroups.map((group) => group.id),
    },
    validators: { onSubmit: institutionalGroupsFieldErrors(updateUserSchema) },
    onSubmit: ({ value }) => save.mutate(value),
  });

  const statusItems = settableUserStatuses(user.status).map((status) => ({
    value: status,
    label: userStatusLabel(status),
    display: <UserStatusBadge status={status} />,
  }));
  const memberItems = user.manualGroups.map((group) => ({
    value: group.id,
    label: group.name,
  }));
  const memberIds = new Set(memberItems.map((item) => item.value));
  const groupItems = [
    ...memberItems,
    ...(catalog.data?.data ?? [])
      .filter((group) => !memberIds.has(group.id))
      .map((group) => ({ value: group.id, label: group.name })),
  ];

  return (
    <form
      noValidate
      aria-label={m.user_form_title()}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="grid w-full gap-4"
    >
      <form.AppField name="status">
        {(field) => (
          <field.ComboboxField
            label={m.column_status()}
            clearable={false}
            items={statusItems}
            placeholder={m.user_status_placeholder()}
            searchPlaceholder={m.user_status_placeholder()}
            emptyText={m.user_status_empty()}
          />
        )}
      </form.AppField>

      <hr />

      <FormSection title={m.settings_institution_title()}>
        <form.AppForm>
          <InstitutionalGroupsFields />
        </form.AppForm>
      </FormSection>

      <hr />

      <form.Subscribe selector={(state) => state.values.status}>
        {(status) => (
          <>
            <form.AppField name="manualGroupIds">
              {(field) => (
                <field.MultiComboboxField
                  label={m.user_manual_groups_title()}
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

      <div>
        <form.AppForm>
          <form.SubmitButton
            label={m.action_save()}
            disabled={save.isPending}
          />
        </form.AppForm>
      </div>
    </form>
  );
}
