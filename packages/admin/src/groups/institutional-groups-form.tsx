import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import { setInstitutionalGroupsSchema } from "@projet-igsn/domain/institutional-group/institutional-groups-validator";
import {
  laboratoryLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { ORGANIZATIONS } from "@projet-igsn/domain/sample/scientific-context/organization";
import { organizationLabel } from "@projet-igsn/domain/sample/scientific-context/organization-label";

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

const organizationItems = ORGANIZATIONS.map(({ ror }) => ({
  value: ror,
  label: organizationLabel(ror),
}));

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
  disabled = false,
}: {
  groups?: InstitutionalGroups;
  disabled?: boolean;
} = {}) {
  const setGroups = useSetInstitutionalGroups();
  const form = useAppForm({
    defaultValues: groups,
    validators: { onSubmit: validate },
    onSubmit: ({ value }) => {
      const parsed = setInstitutionalGroupsSchema.safeParse(value);
      if (parsed.success) setGroups.mutate(parsed.data);
    },
  });

  return (
    <FieldDisabledProvider value={() => disabled}>
      <form
        noValidate
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
                      ror === null
                        ? []
                        : toItems(filterOsusByOrg(ror), osuLabel)
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

        {!disabled && (
          <div>
            <form.AppForm>
              <form.SubmitButton
                label={m.action_save()}
                disabled={setGroups.isPending}
              />
            </form.AppForm>
          </div>
        )}
      </form>
    </FieldDisabledProvider>
  );
}
