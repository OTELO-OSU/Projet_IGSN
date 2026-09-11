import type {
  ServiceAccountBody,
  ServiceAccountDraft,
} from "@projet-igsn/domain/service-account/service-account-validator";
import type { ReactNode } from "react";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { serviceAccountBodySchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";

import { institutionalGroupsFieldErrors } from "#/institutional-groups/institutional-groups-field-errors.ts";
import { InstitutionalGroupsFields } from "#/institutional-groups/institutional-groups-fields.tsx";
import { isNameTaken } from "#/is-name-taken.ts";
import {
  CATALOG_PAGE,
  useManualGroups,
} from "#/manual-groups/use-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { ManagedGroupsFields } from "#/users/managed-groups-fields.tsx";
import { UserField } from "#/users/user-field.tsx";

const OWNER_FIELD_ID = "service-account-owner";

const validateBody = institutionalGroupsFieldErrors(serviceAccountBodySchema);

const toDraft = (draft?: ServiceAccountDraft): ServiceAccountDraft => ({
  name: draft?.name ?? "",
  institutionalOrganization: draft?.institutionalOrganization ?? null,
  institutionalOsu: draft?.institutionalOsu ?? null,
  institutionalLaboratory: draft?.institutionalLaboratory ?? null,
  managedGroups: draft?.managedGroups ?? NO_MANAGED_GROUPS,
  owner: draft?.owner ?? null,
});

const composeBody = ({ owner, ...draft }: ServiceAccountDraft) => ({
  ...draft,
  ownerId: owner?.id,
});

const validateDraft = ({ value }: { value: ServiceAccountDraft }) => {
  const errors = validateBody({ value: composeBody(value) });
  if (!errors) return undefined;
  const { ownerId, ...fields } = errors.fields;
  return {
    fields: ownerId
      ? {
          ...fields,
          owner: { message: m.field_service_account_owner_required() },
        }
      : fields,
  };
};

export function ServiceAccountForm({
  draft,
  afterName,
  submitLabel,
  onSave,
}: {
  draft?: ServiceAccountDraft;
  afterName?: ReactNode;
  submitLabel: string;
  onSave: (body: ServiceAccountBody) => Promise<unknown>;
}) {
  const catalog = useManualGroups(CATALOG_PAGE);
  const form = useAppForm({
    defaultValues: toDraft(draft),
    validators: {
      onSubmit: validateDraft,
      onSubmitAsync: async ({ value }) => {
        try {
          await onSave(serviceAccountBodySchema.parse(composeBody(value)));
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

      {afterName}

      <div className="grid gap-2">
        <Label htmlFor={OWNER_FIELD_ID}>
          {withRequired(m.field_service_account_owner(), true)}
        </Label>
        <form.AppField name="owner">
          {() => <UserField id={OWNER_FIELD_ID} status="accepted" />}
        </form.AppField>
      </div>

      <FormSection title={m.settings_institution_title()}>
        <form.AppForm>
          <InstitutionalGroupsFields />
        </form.AppForm>
      </FormSection>

      <form.AppForm>
        <ManagedGroupsFields
          granted={draft?.managedGroups ?? NO_MANAGED_GROUPS}
          manualGroups={catalog.data?.data ?? []}
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
