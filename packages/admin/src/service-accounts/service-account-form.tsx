import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";
import type { ServiceAccountBody } from "@projet-igsn/domain/service-account/service-account-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { serviceAccountBodySchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";

import { institutionalGroupsFieldErrors } from "#/institutional-groups/institutional-groups-field-errors.ts";
import { InstitutionalGroupsFields } from "#/institutional-groups/institutional-groups-fields.tsx";
import { isNameTaken } from "#/manual-groups/is-name-taken.ts";
import { m } from "#/paraglide/messages.js";
import { ManagedGroupsFields } from "#/users/managed-groups-fields.tsx";

const validateServiceAccount = institutionalGroupsFieldErrors(
  serviceAccountBodySchema,
);

const toDraft = (account?: ServiceAccount) => ({
  name: account?.name ?? "",
  institutionalOrganization: account?.institutionalOrganization ?? null,
  institutionalOsu: account?.institutionalOsu ?? null,
  institutionalLaboratory: account?.institutionalLaboratory ?? null,
  managedGroups: account?.managedGroups ?? NO_MANAGED_GROUPS,
});

const compose = (draft: ReturnType<typeof toDraft>) => ({
  ...draft,
  institutionalOsu: draft.institutionalOsu ?? null,
});

export function ServiceAccountForm({
  account,
  submitLabel,
  onSave,
}: {
  account?: ServiceAccount;
  submitLabel: string;
  onSave: (body: ServiceAccountBody) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: toDraft(account),
    validators: {
      onSubmit: ({ value }) =>
        validateServiceAccount({ value: compose(value) }),
      onSubmitAsync: async ({ value }) => {
        try {
          await onSave(serviceAccountBodySchema.parse(compose(value)));
          return undefined;
        } catch (error) {
          return isNameTaken(error)
            ? { fields: { name: { message: m.service_account_name_taken() } } }
            : undefined;
        }
      },
    },
  });

  return (
    <form
      noValidate
      aria-label={m.service_account_form_title()}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="grid w-full gap-4"
    >
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label={m.field_service_account_name()}
            requiredToPublish
          />
        )}
      </form.AppField>

      <FormSection title={m.settings_institution_title()}>
        <form.AppForm>
          <InstitutionalGroupsFields />
        </form.AppForm>
      </FormSection>

      <form.AppForm>
        <ManagedGroupsFields
          granted={account?.managedGroups ?? NO_MANAGED_GROUPS}
        />
      </form.AppForm>

      <div>
        <form.AppForm>
          <form.SubmitButton label={submitLabel} />
        </form.AppForm>
      </div>
    </form>
  );
}
