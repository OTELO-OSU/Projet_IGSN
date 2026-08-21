import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";

import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import {
  laboratoryLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";

import {
  ORGANIZATION_ITEMS,
  toItems,
} from "#/institutional-groups/to-items.ts";
import { m } from "#/paraglide/messages.js";

export function InstitutionalGroupsFields() {
  const form = useTypedAppFormContext({
    defaultValues: {} as InstitutionalGroups,
  });

  return (
    <>
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
            items={ORGANIZATION_ITEMS}
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
    </>
  );
}
