import type {
  AdminUser,
  UpdateUser,
} from "@projet-igsn/domain/user/user-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { canManageManualGroup } from "@projet-igsn/domain/user/can-manage-manual-group";
import { settableUserStatuses } from "@projet-igsn/domain/user/settable-user-statuses";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import { updateUserSchema } from "@projet-igsn/domain/user/user-validator";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { institutionalGroupsFieldErrors } from "#/institutional-groups/institutional-groups-field-errors.ts";
import { InstitutionalGroupsFields } from "#/institutional-groups/institutional-groups-fields.tsx";
import { useManualGroups } from "#/manual-groups/use-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import {
  MANAGED_LABORATORY_ITEMS,
  MANAGED_ORGANIZATION_ITEMS,
  MANAGED_OSU_ITEMS,
  withGranted,
} from "#/users/managed-group-items.ts";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";
import { userStatusLabel } from "#/users/user-status-label.ts";

// ponytail: one page of 50 groups, server-side search once the catalog outgrows it
const CATALOG_PAGE = { page: 1, perPage: 50, search: "" };

const toItem = (group: { id: string; name: string }) => ({
  value: group.id,
  label: group.name,
});

const validateUser = institutionalGroupsFieldErrors(updateUserSchema);

const composeUser = (draft: UpdateUser): UpdateUser => ({
  ...draft,
  institutionalOrganization: draft.institutionalOrganization ?? null,
  institutionalOsu: draft.institutionalOsu ?? null,
  institutionalLaboratory: draft.institutionalLaboratory ?? null,
});

export function UserForm({
  user,
  save,
}: {
  user: AdminUser;
  save: { mutate: (user: UpdateUser) => void; isPending: boolean };
}) {
  const me = useCurrentUser().data;
  const isSuperAdmin = me?.superAdmin === true;
  const myManagedGroups = me?.managedManualGroups ?? [];
  const caller = {
    superAdmin: isSuperAdmin,
    managedLaboratories: me?.managedLaboratories ?? [],
    managedManualGroupIds: myManagedGroups.map((group) => group.id),
  };
  const rights = userManagementRights(caller, user);
  const catalog = useManualGroups(CATALOG_PAGE, isSuperAdmin);
  const form = useAppForm({
    defaultValues: {
      status: user.status,
      institutionalOrganization: user.institutionalOrganization,
      institutionalOsu: user.institutionalOsu,
      institutionalLaboratory: user.institutionalLaboratory,
      manualGroupIds: user.manualGroups.map((group) => group.id),
      managedGroups: user.managedGroups,
    },
    validators: {
      onSubmit: ({ value }) => validateUser({ value: composeUser(value) }),
    },
    onSubmit: ({ value }) => save.mutate(composeUser(value)),
  });

  const statusItems = settableUserStatuses(user.status).map((status) => ({
    value: status,
    label: userStatusLabel(status),
    display: <UserStatusBadge status={status} />,
  }));
  const memberItems = user.manualGroups.map(toItem);
  const memberIds = new Set(memberItems.map((item) => item.value));
  const catalogItems = (catalog.data?.data ?? []).map(toItem);
  const attachable = isSuperAdmin ? catalogItems : myManagedGroups.map(toItem);
  const groupItems = [
    ...memberItems,
    ...attachable.filter((item) => !memberIds.has(item.value)),
  ];
  const lockedGroupIds = memberItems
    .map((item) => item.value)
    .filter((id) => !canManageManualGroup(caller, id));
  const managedFields = [
    {
      name: "managedGroups.organizations",
      label: m.field_managed_organizations(),
      items: withGranted(
        MANAGED_ORGANIZATION_ITEMS,
        user.managedGroups.organizations,
      ),
      placeholder: m.organization_placeholder(),
      emptyText: m.organization_empty(),
    },
    {
      name: "managedGroups.osus",
      label: m.field_managed_osus(),
      items: MANAGED_OSU_ITEMS,
      placeholder: m.osu_placeholder(),
      emptyText: m.osu_empty(),
    },
    {
      name: "managedGroups.laboratories",
      label: m.field_managed_laboratories(),
      items: MANAGED_LABORATORY_ITEMS,
      placeholder: m.laboratory_placeholder(),
      emptyText: m.laboratory_empty(),
    },
    {
      name: "managedGroups.manualGroupIds",
      label: m.field_managed_manual_groups(),
      items: withGranted(catalogItems, user.managedGroups.manualGroupIds),
      placeholder: m.manual_group_placeholder(),
      emptyText: m.manual_groups_empty(),
    },
  ] as const;

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
            disabled={!rights.status}
            items={statusItems}
            placeholder={m.user_status_placeholder()}
            searchPlaceholder={m.user_status_placeholder()}
            emptyText={m.user_status_empty()}
          />
        )}
      </form.AppField>

      <hr />

      <FormSection title={m.settings_institution_title()}>
        <FieldDisabledProvider value={() => !rights.institutions}>
          <form.AppForm>
            <InstitutionalGroupsFields />
          </form.AppForm>
        </FieldDisabledProvider>
      </FormSection>

      <hr />

      <form.Subscribe selector={(state) => state.values.status}>
        {(status) => (
          <>
            <form.AppField name="manualGroupIds">
              {(field) => (
                <field.MultiComboboxField
                  label={m.user_manual_groups_title()}
                  disabled={!rights.manualGroups}
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

      {rights.managedGroups && (
        <>
          <hr />

          <FormSection title={m.user_managed_groups_title()}>
            <p className="text-muted-foreground text-sm">
              {m.user_managed_groups_cascade()}
            </p>
            {managedFields.map(
              ({ name, label, items, placeholder, emptyText }) => (
                <form.AppField key={name} name={name}>
                  {(field) => (
                    <field.MultiComboboxField
                      label={label}
                      items={items}
                      placeholder={placeholder}
                      searchPlaceholder={m.managed_search_placeholder()}
                      emptyText={emptyText}
                      removeLabel={(picked) =>
                        m.managed_remove({ name: picked })
                      }
                    />
                  )}
                </form.AppField>
              ),
            )}
          </FormSection>
        </>
      )}

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
