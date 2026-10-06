import type { ComboboxItem } from "@projet-igsn/design-system/components/ui/combobox";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { zodFieldErrors } from "@projet-igsn/domain/form/zod-field-errors";
import {
  MANAGED_LABORATORY_ITEMS,
  MANAGED_ORGANIZATION_ITEMS,
  MANAGED_OSU_ITEMS,
} from "@projet-igsn/domain/institutional-group/managed-group-items";
import {
  type ServiceAccountRequest,
  serviceAccountRequestSchema,
} from "@projet-igsn/domain/service-account/service-account-validator";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";

import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { useListRequestableGroups } from "#/service-accounts/use-list-requestable-groups.ts";
import { useRequestServiceAccount } from "#/service-accounts/use-request-service-account.ts";
import { UserField } from "#/users/user-field.tsx";

const SAMPLE_OWNER_FIELD_ID = "service-account-request-sample-owner";

type RequestDraft = Omit<ServiceAccountRequest, "sampleOwnerId"> & {
  sampleOwner: UserIdentity | null;
};

const validateRequest = zodFieldErrors(serviceAccountRequestSchema, () =>
  m.field_required(),
);

const toRequest = ({ sampleOwner, ...draft }: RequestDraft) => ({
  ...draft,
  sampleOwnerId: sampleOwner?.id,
});

const validate = ({ value }: { value: RequestDraft }) => {
  const errors = validateRequest({ value: toRequest(value) });
  if (!errors) return undefined;
  const { sampleOwnerId, ...fields } = errors.fields;
  return {
    fields: {
      ...fields,
      ...(sampleOwnerId && {
        sampleOwner: {
          message: m.field_service_account_sample_owner_required(),
        },
      }),
    },
  };
};

const EMPTY_REQUEST: RequestDraft = {
  name: "",
  reason: "",
  managedGroups: NO_MANAGED_GROUPS,
  sampleOwner: null,
};

const requestableItems = (items: ComboboxItem[], codes?: string[]) =>
  codes && items.filter(({ value }) => codes.includes(value));

export function RequestServiceAccountForm({ onSent }: { onSent: () => void }) {
  const attachableGroups = useAttachableManualGroups().data?.data;
  const requestableGroups = useListRequestableGroups().data?.data;
  const { mutate } = useRequestServiceAccount(onSent);
  const form = useAppForm({
    defaultValues: EMPTY_REQUEST,
    validators: { onSubmit: validate },
    onSubmit: ({ value }) =>
      mutate(serviceAccountRequestSchema.parse(toRequest(value))),
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
        {(field) => (
          <field.TextField
            label={m.service_account_field_name()}
            requiredToPublish
          />
        )}
      </form.AppField>
      <form.AppField name="reason">
        {(field) => (
          <field.TextField
            label={m.service_account_field_reason()}
            multiline
            requiredToPublish
          />
        )}
      </form.AppField>
      <div className="grid gap-2">
        <Label htmlFor={SAMPLE_OWNER_FIELD_ID}>
          {withRequired(m.field_service_account_sample_owner(), true)}
        </Label>
        <form.AppField name="sampleOwner">
          {() => (
            <UserField
              id={SAMPLE_OWNER_FIELD_ID}
              status="accepted"
              inMyGroups
              includeSelf
            />
          )}
        </form.AppField>
      </div>
      {groupFields.map(
        ({ name, label, items, placeholder, emptyText, noneText }) =>
          items?.length === 0 ? (
            <div key={name} className="grid gap-2">
              <p className="text-sm leading-none font-medium">{label}</p>
              <p className="text-muted-foreground text-sm">{noneText}</p>
            </div>
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
