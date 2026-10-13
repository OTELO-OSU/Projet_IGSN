import type {
  AdminUser,
  UpdateUser,
} from "@projet-igsn/domain/user/user-validator";
import type { UseMutationResult } from "@tanstack/react-query";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { canBecomeSuperAdmin } from "@projet-igsn/domain/user/can-become-super-admin";
import { canManageManualGroup } from "@projet-igsn/domain/user/can-manage-manual-group";
import { canSetSuperAdmin } from "@projet-igsn/domain/user/can-set-super-admin";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { settableUserStatuses } from "@projet-igsn/domain/user/settable-user-statuses";
import { shouldRePendOnInstitutionsUpdate } from "@projet-igsn/domain/user/should-re-pend-on-institutions-update";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import { updateUserSchema } from "@projet-igsn/domain/user/user-validator";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { ConfirmButton } from "#/confirm-button.tsx";
import { institutionalGroupsFieldErrors } from "#/institutional-groups/institutional-groups-field-errors.ts";
import { InstitutionalGroupsFields } from "#/institutional-groups/institutional-groups-fields.tsx";
import {
  CATALOG_PAGE,
  useManualGroups,
} from "#/manual-groups/use-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { ManagedGroupsFields } from "#/users/managed-groups-fields.tsx";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";
import { userStatusLabel } from "#/users/user-status-label.ts";

const toItem = (group: { id: string; name: string }) => ({
  value: group.id,
  label: group.name,
});

const validateUser = institutionalGroupsFieldErrors(updateUserSchema);

const toDraft = (user: AdminUser) => ({
  status: user.status,
  institutionalOrganization: user.institutionalOrganization,
  institutionalOsu: user.institutionalOsu,
  institutionalLaboratory: user.institutionalLaboratory,
  manualGroupIds: user.manualGroups.map((group) => group.id),
  managedGroups: user.managedGroups,
  superAdmin: user.superAdmin,
});

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
  save: Pick<
    UseMutationResult<AdminUser, Error, UpdateUser>,
    "mutate" | "isPending"
  >;
}) {
  const me = useCurrentUser().data;
  const isSuperAdmin = me?.superAdmin === true;
  const myManagedGroups = me?.managedManualGroups ?? [];
  const caller = {
    callerId: me?.id ?? "",
    superAdmin: isSuperAdmin,
    managedLaboratories: me?.managedLaboratories ?? [],
    managedManualGroupIds: myManagedGroups.map((group) => group.id),
  };
  const rights = userManagementRights(caller, user);
  const catalog = useManualGroups(CATALOG_PAGE, isSuperAdmin);
  const form = useAppForm({
    defaultValues: toDraft(user),
    validators: {
      onSubmit: ({ value }) => validateUser({ value: composeUser(value) }),
    },
    onSubmit: ({ value, formApi }) =>
      save.mutate(composeUser(value), {
        onSuccess: (saved) => formApi.reset(toDraft(saved)),
      }),
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
  const lockedGroupIds = user.manualGroups
    .filter(
      (group) => !group.canDetach || !canManageManualGroup(caller, group.id),
    )
    .map((group) => group.id);

  const statusField = (
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
  );
  const superAdminHint = (status: UpdateUser["status"]) => {
    if (!canSetSuperAdmin(caller, user.id)) return m.user_super_admin_self();
    if (!user.superAdmin && !canBecomeSuperAdmin(status)) {
      return m.user_super_admin_active_only();
    }
    return null;
  };
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
    <form
      noValidate
      aria-label={m.user_form_title()}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="grid w-full gap-4 pb-16"
    >
      <FormSection title={m.user_form_title()}>
        <form.Subscribe
          selector={(state) => state.values.institutionalOrganization ?? null}
        >
          {(organization) =>
            shouldRePendOnInstitutionsUpdate(user, organization)
              ? rePendNotice
              : statusField
          }
        </form.Subscribe>
        {isSuperAdmin && (
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
                  {hint && (
                    <p className="text-muted-foreground text-sm">{hint}</p>
                  )}
                </>
              );
            }}
          </form.Subscribe>
        )}
      </FormSection>

      <FormSection title={m.settings_institution_title()}>
        <FieldDisabledProvider value={() => !rights.institutions}>
          <form.AppForm>
            <InstitutionalGroupsFields optional />
          </form.AppForm>
        </FieldDisabledProvider>
      </FormSection>

      <FormSection title={m.user_manual_groups_title()}>
        <form.Subscribe selector={(state) => state.values.status}>
          {(status) => (
            <>
              <form.AppField name="manualGroupIds">
                {(field) => (
                  <field.MultiComboboxField
                    label={m.field_user_manual_groups()}
                    disabled={!rights.manualGroups}
                    lockedValues={lockedGroupIds}
                    items={
                      canJoinManualGroup(status) ? groupItems : memberItems
                    }
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
      </FormSection>

      {rights.managedGroups && (
        <form.AppForm>
          <ManagedGroupsFields
            granted={user.managedGroups}
            manualGroups={catalog.data?.data ?? []}
          />
        </form.AppForm>
      )}

      <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-end gap-2 border-t px-6 py-3 md:left-(--sidebar-width) md:duration-500 md:ease-in-out md:motion-safe:transition-[left]">
        <form.Subscribe selector={(state) => state.values.superAdmin}>
          {(superAdmin) =>
            superAdmin === user.superAdmin ? (
              <form.AppForm>
                <form.SubmitButton
                  label={m.action_save()}
                  disabled={save.isPending}
                />
              </form.AppForm>
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
                disabled={save.isPending}
                onConfirm={() => void form.handleSubmit()}
              >
                {m.action_save()}
              </ConfirmButton>
            )
          }
        </form.Subscribe>
      </div>
    </form>
  );
}
