import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { filterOrganizationsWithLaboratory } from "@projet-igsn/domain/institutional-group/filter-organizations-with-laboratory";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import { setInstitutionalGroupsSchema } from "@projet-igsn/domain/institutional-group/institutional-groups-validator";
import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";

import { m } from "#/paraglide/messages.js";

import { useSetInstitutionalGroups } from "./use-set-institutional-groups.ts";

const EMPTY: InstitutionalGroups = {
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

const toItems = (
  entries: readonly { code: string }[],
  label: (code: string) => string,
) => entries.map(({ code }) => ({ value: code, label: label(code) }));

const organizationItems = filterOrganizationsWithLaboratory().map(
  ({ ror }) => ({
    value: ror,
    label: organizationLabel(ror),
  }),
);

const willResetStatus = (
  values: InstitutionalGroups,
  saved: InstitutionalGroups,
) =>
  saved.institutionalOrganization !== null &&
  (values.institutionalOrganization !== saved.institutionalOrganization ||
    values.institutionalOsu !== saved.institutionalOsu ||
    values.institutionalLaboratory !== saved.institutionalLaboratory) &&
  setInstitutionalGroupsSchema.safeParse(values).success;

const validate = ({ value }: { value: InstitutionalGroups }) => {
  const parsed = setInstitutionalGroupsSchema.safeParse(value);
  if (parsed.success) return undefined;
  return {
    fields: Object.fromEntries(
      parsed.error.issues.map((issue) => [
        issue.path.join("."),
        { message: m.institutional_groups_required() },
      ]),
    ),
  };
};

export function InstitutionalGroupsForm({
  groups = EMPTY,
}: { groups?: InstitutionalGroups } = {}) {
  const setGroups = useSetInstitutionalGroups();
  const form = useAppForm({
    defaultValues: {
      institutionalOrganization: groups.institutionalOrganization,
      institutionalOsu: groups.institutionalOsu,
      institutionalLaboratory: groups.institutionalLaboratory,
    },
    validators: { onSubmit: validate },
    onSubmit: ({ value }) => {
      const parsed = setInstitutionalGroupsSchema.safeParse(value);
      if (parsed.success) setGroups.mutate(parsed.data);
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
      <form.AppField
        name="institutionalOrganization"
        listeners={{
          onChange: () => {
            form.setFieldValue("institutionalOsu", null);
            form.setFieldValue("institutionalLaboratory", null);
          },
        }}
      >
        {(field) => (
          <field.ComboboxField
            label={m.field_institutional_organization()}
            requiredToPublish
            items={organizationItems}
            placeholder={m.organization_placeholder()}
            searchPlaceholder={m.organization_search_placeholder()}
            emptyText={m.organization_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe selector={(state) => state.values}>
        {({ institutionalOrganization: ror, institutionalOsu: osu }) => (
          <>
            <form.AppField
              name="institutionalOsu"
              listeners={{
                onChange: () =>
                  form.setFieldValue("institutionalLaboratory", null),
              }}
            >
              {(field) => (
                <field.ComboboxField
                  label={m.field_institutional_osu()}
                  items={
                    ror === null ? [] : toItems(filterOsusByOrg(ror), osuLabel)
                  }
                  placeholder={m.osu_placeholder()}
                  searchPlaceholder={m.osu_search_placeholder()}
                  emptyText={m.osu_empty()}
                />
              )}
            </form.AppField>

            <form.AppField name="institutionalLaboratory">
              {(field) => (
                <field.ComboboxField
                  label={m.field_institutional_laboratory()}
                  requiredToPublish
                  items={
                    ror === null
                      ? []
                      : toItems(
                          filterLaboratoriesByOrgAndOsu({
                            organizationRor: ror,
                            osu,
                          }),
                          laboratoryLabel,
                        )
                  }
                  placeholder={m.laboratory_placeholder()}
                  searchPlaceholder={m.laboratory_search_placeholder()}
                  emptyText={m.laboratory_empty()}
                />
              )}
            </form.AppField>
          </>
        )}
      </form.Subscribe>

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
                disabled={setGroups.isPending}
                onConfirm={() => void form.handleSubmit()}
              >
                {m.action_save()}
              </ConfirmButton>
            ) : (
              <form.AppForm>
                <form.SubmitButton
                  label={m.action_save()}
                  disabled={setGroups.isPending}
                />
              </form.AppForm>
            )
          }
        </form.Subscribe>
      </div>
    </form>
  );
}
