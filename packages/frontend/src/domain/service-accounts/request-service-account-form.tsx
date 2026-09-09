import type { ComboboxItem } from "@projet-igsn/design-system/components/ui/combobox";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import {
  MANAGED_LABORATORY_ITEMS,
  MANAGED_ORGANIZATION_ITEMS,
  MANAGED_OSU_ITEMS,
} from "@projet-igsn/domain/institutional-group/managed-group-items";
import { serviceAccountRequestSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";

import { useListAttachableManualGroups } from "#/domain/manual-groups/hook/list-attachable-manual-groups.ts";
import { useListRequestableGroups } from "#/domain/service-accounts/hook/list-requestable-groups.ts";
import { useRequestServiceAccount } from "#/domain/service-accounts/hook/request-service-account.ts";
import { zodFieldErrors } from "#/domain/zod-field-errors.ts";
import { m } from "#/paraglide/messages.js";

const validate = zodFieldErrors(serviceAccountRequestSchema, () =>
  m.field_required(),
);

const requestableItems = (items: ComboboxItem[], codes?: string[]) =>
  codes && items.filter(({ value }) => codes.includes(value));

export function RequestServiceAccountForm({ onSent }: { onSent: () => void }) {
  const { data: attachableGroups } = useListAttachableManualGroups();
  const { data: requestableGroups } = useListRequestableGroups();
  const { mutate } = useRequestServiceAccount(onSent);
  const form = useAppForm({
    defaultValues: { name: "", reason: "", managedGroups: NO_MANAGED_GROUPS },
    validators: { onSubmit: validate },
    onSubmit: ({ value }) => mutate(value),
  });

  const groupFields = [
    {
      name: "managedGroups.organizations",
      label: m.service_account_field_organizations(),
      items: requestableItems(
        MANAGED_ORGANIZATION_ITEMS,
        requestableGroups?.organizations,
      ),
      placeholder: m.service_account_organization_placeholder(),
      emptyText: m.service_account_organization_empty(),
      noneText: m.service_account_organization_none(),
    },
    {
      name: "managedGroups.osus",
      label: m.service_account_field_osus(),
      items: requestableItems(MANAGED_OSU_ITEMS, requestableGroups?.osus),
      placeholder: m.service_account_osu_placeholder(),
      emptyText: m.service_account_osu_empty(),
      noneText: m.service_account_osu_none(),
    },
    {
      name: "managedGroups.laboratories",
      label: m.service_account_field_laboratories(),
      items: requestableItems(
        MANAGED_LABORATORY_ITEMS,
        requestableGroups?.laboratories,
      ),
      placeholder: m.service_account_laboratory_placeholder(),
      emptyText: m.service_account_laboratory_empty(),
      noneText: m.service_account_laboratory_none(),
    },
    {
      name: "managedGroups.manualGroupIds",
      label: m.service_account_field_manual_groups(),
      items: attachableGroups?.map(({ id, name }) => ({
        value: id,
        label: name,
      })),
      placeholder: m.service_account_manual_group_placeholder(),
      emptyText: m.service_account_manual_group_empty(),
      noneText: m.service_account_manual_group_none(),
    },
  ] as const;

  return (
    <form
      noValidate
      aria-label={m.service_account_request_action()}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="grid gap-4"
    >
      <form.AppField name="name">
        {(field) => <field.TextField label={m.service_account_field_name()} />}
      </form.AppField>
      <form.AppField name="reason">
        {(field) => (
          <field.TextField label={m.service_account_field_reason()} multiline />
        )}
      </form.AppField>
      {groupFields.map(
        ({ name, label, items, placeholder, emptyText, noneText }) =>
          items?.length === 0 ? (
            <p key={name} className="text-muted-foreground text-sm">
              {noneText}
            </p>
          ) : (
            <form.AppField key={name} name={name}>
              {(field) => (
                <field.MultiComboboxField
                  label={label}
                  items={items ?? []}
                  placeholder={placeholder}
                  searchPlaceholder={m.service_account_search_placeholder()}
                  emptyText={emptyText}
                  removeLabel={(picked) =>
                    m.service_account_remove({ name: picked })
                  }
                />
              )}
            </form.AppField>
          ),
      )}
      <div>
        <form.AppForm>
          <form.SubmitButton label={m.service_account_request_submit()} />
        </form.AppForm>
      </div>
    </form>
  );
}
