import type {
  AdminUser,
  UpdateUser,
} from "@projet-igsn/domain/user/user-validator";
import type { UseMutationResult } from "@tanstack/react-query";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import { updateUserSchema } from "@projet-igsn/domain/user/user-validator";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { institutionalGroupsFieldErrors } from "#/institutional-groups/institutional-groups-field-errors.ts";
import { InstitutionalGroupsFields } from "#/institutional-groups/institutional-groups-fields.tsx";
import {
  CATALOG_PAGE,
  useManualGroups,
} from "#/manual-groups/use-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { buildUserManualGroupItems } from "#/users/build-user-manual-group-items.ts";
import { composeUser, toUserDraft } from "#/users/compose-user.ts";
import { ManagedGroupsFields } from "#/users/managed-groups-fields.tsx";
import { UserManualGroupsField } from "#/users/user-manual-groups-field.tsx";
import { UserSaveButton } from "#/users/user-save-button.tsx";
import { UserStatusField } from "#/users/user-status-field.tsx";
import { UserSuperAdminField } from "#/users/user-super-admin-field.tsx";

const validateUser = institutionalGroupsFieldErrors(updateUserSchema);

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
    defaultValues: toUserDraft(user),
    validators: {
      onSubmit: ({ value }) => validateUser({ value: composeUser(value) }),
    },
    onSubmit: ({ value, formApi }) =>
      save.mutate(composeUser(value), {
        onSuccess: (saved) => formApi.reset(toUserDraft(saved)),
      }),
  });

  const manualGroupItems = buildUserManualGroupItems(
    caller,
    user.manualGroups,
    isSuperAdmin ? (catalog.data?.data ?? []) : myManagedGroups,
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
      <form.AppForm>
        <FormSection title={m.user_form_title()}>
          <UserStatusField user={user} disabled={!rights.status} />
          {isSuperAdmin && <UserSuperAdminField user={user} caller={caller} />}
        </FormSection>

        <FormSection title={m.settings_institution_title()}>
          <FieldDisabledProvider value={() => !rights.institutions}>
            <InstitutionalGroupsFields optional />
          </FieldDisabledProvider>
        </FormSection>

        <FormSection title={m.user_manual_groups_title()}>
          <UserManualGroupsField
            disabled={!rights.manualGroups}
            {...manualGroupItems}
          />
        </FormSection>

        {rights.managedGroups && (
          <ManagedGroupsFields
            granted={user.managedGroups}
            manualGroups={catalog.data?.data ?? []}
          />
        )}

        <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-end gap-2 border-t px-6 py-3 md:left-(--sidebar-width) md:duration-500 md:ease-in-out md:motion-safe:transition-[left]">
          <UserSaveButton user={user} isPending={save.isPending} />
        </div>
      </form.AppForm>
    </form>
  );
}
