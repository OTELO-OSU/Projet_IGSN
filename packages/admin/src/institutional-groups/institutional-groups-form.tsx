import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import {
  type SetInstitutionalGroups,
  setInstitutionalGroupsSchema,
} from "@projet-igsn/domain/institutional-group/institutional-groups-validator";

import { institutionalGroupsFieldErrors } from "#/institutional-groups/institutional-groups-field-errors.ts";
import { InstitutionalGroupsFields } from "#/institutional-groups/institutional-groups-fields.tsx";
import { m } from "#/paraglide/messages.js";

const EMPTY: InstitutionalGroups = {
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

const willResetStatus = (
  values: InstitutionalGroups,
  saved: InstitutionalGroups,
) =>
  saved.institutionalOrganization !== null &&
  (values.institutionalOrganization !== saved.institutionalOrganization ||
    values.institutionalOsu !== saved.institutionalOsu ||
    values.institutionalLaboratory !== saved.institutionalLaboratory) &&
  setInstitutionalGroupsSchema.safeParse(values).success;

export function InstitutionalGroupsForm({
  groups = EMPTY,
  save,
}: {
  groups?: InstitutionalGroups;
  save: {
    mutate: (groups: SetInstitutionalGroups) => void;
    isPending: boolean;
  };
}) {
  const form = useAppForm({
    defaultValues: {
      institutionalOrganization: groups.institutionalOrganization,
      institutionalOsu: groups.institutionalOsu,
      institutionalLaboratory: groups.institutionalLaboratory,
    },
    validators: {
      onSubmit: institutionalGroupsFieldErrors(setInstitutionalGroupsSchema),
    },
    onSubmit: ({ value }) => {
      const parsed = setInstitutionalGroupsSchema.safeParse(value);
      if (parsed.success) save.mutate(parsed.data);
    },
  });

  return (
    <form
      noValidate
      aria-label={m.settings_institution_title()}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="grid w-full max-w-md gap-4 text-left"
    >
      <form.AppForm>
        <InstitutionalGroupsFields />
      </form.AppForm>

      <div>
        <form.Subscribe selector={(state) => state.values}>
          {(values) =>
            willResetStatus(values, groups) ? (
              <ConfirmButton
                title={m.settings_institution_change_title()}
                description={m.settings_institution_change_description()}
                confirmLabel={m.action_confirm()}
                cancelLabel={m.action_cancel()}
                closeLabel={m.action_close()}
                disabled={save.isPending}
                onConfirm={() => void form.handleSubmit()}
              >
                {m.action_save()}
              </ConfirmButton>
            ) : (
              <form.AppForm>
                <form.SubmitButton
                  label={m.action_save()}
                  disabled={save.isPending}
                />
              </form.AppForm>
            )
          }
        </form.Subscribe>
      </div>
    </form>
  );
}
