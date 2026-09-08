import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import {
  MANAGED_LABORATORY_ITEMS,
  MANAGED_ORGANIZATION_ITEMS,
  MANAGED_OSU_ITEMS,
} from "@projet-igsn/domain/institutional-group/managed-group-items";
import { serviceAccountRequestSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";

import { useListAttachableManualGroups } from "#/domain/manual-groups/hook/list-attachable-manual-groups.ts";
import { useRequestServiceAccount } from "#/domain/service-accounts/hook/request-service-account.ts";
import { m } from "#/paraglide/messages.js";

const validate = ({ value }: { value: unknown }) => {
  const parsed = serviceAccountRequestSchema.safeParse(value);
  if (parsed.success) {
    return undefined;
  }
  return {
    fields: Object.fromEntries(
      parsed.error.issues.map((issue) => [
        issue.path.join("."),
        { message: m.field_required() },
      ]),
    ),
  };
};

export function RequestServiceAccountForm({ onSent }: { onSent: () => void }) {
  const { data: attachableGroups } = useListAttachableManualGroups();
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
      items: MANAGED_ORGANIZATION_ITEMS,
      placeholder: m.service_account_organization_placeholder(),
      emptyText: m.service_account_organization_empty(),
    },
    {
      name: "managedGroups.osus",
      label: m.service_account_field_osus(),
      items: MANAGED_OSU_ITEMS,
      placeholder: m.service_account_osu_placeholder(),
      emptyText: m.service_account_osu_empty(),
    },
    {
      name: "managedGroups.laboratories",
      label: m.service_account_field_laboratories(),
      items: MANAGED_LABORATORY_ITEMS,
      placeholder: m.service_account_laboratory_placeholder(),
      emptyText: m.service_account_laboratory_empty(),
    },
    {
      name: "managedGroups.manualGroupIds",
      label: m.service_account_field_manual_groups(),
      items: (attachableGroups ?? []).map(({ id, name }) => ({
        value: id,
        label: name,
      })),
      placeholder: m.service_account_manual_group_placeholder(),
      emptyText: m.service_account_manual_group_empty(),
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
      {groupFields.map(({ name, label, items, placeholder, emptyText }) => (
        <form.AppField key={name} name={name}>
          {(field) => (
            <field.MultiComboboxField
              label={label}
              items={items}
              placeholder={placeholder}
              searchPlaceholder={m.service_account_search_placeholder()}
              emptyText={emptyText}
              removeLabel={(picked) =>
                m.service_account_remove({ name: picked })
              }
            />
          )}
        </form.AppField>
      ))}
      <div>
        <form.AppForm>
          <form.SubmitButton label={m.service_account_request_submit()} />
        </form.AppForm>
      </div>
    </form>
  );
}
