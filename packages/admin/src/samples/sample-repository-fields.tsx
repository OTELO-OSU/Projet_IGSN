import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { laboratoryLabel } from "@projet-igsn/domain/institutional-group/label";
import {
  ALL_ORGANIZATION_ITEMS,
  MANAGED_OSU_ITEMS,
  toItems,
} from "@projet-igsn/domain/institutional-group/managed-group-items";

import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleRepositoryFields() {
  const form = useSampleForm();
  return (
    <FormSection level={3} title={m.section_current_archive()}>
      <form.AppField
        name="repository.currentArchiveOsu"
        listeners={{
          onChange: () =>
            form.setFieldValue("repository.currentArchiveLaboratory", null),
        }}
      >
        {(field) => (
          <field.ComboboxField
            label={m.field_archive_osu()}
            items={MANAGED_OSU_ITEMS}
            placeholder={m.osu_placeholder()}
            searchPlaceholder={m.osu_search_placeholder()}
            emptyText={m.osu_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => state.values.repository.currentArchiveOsu}
      >
        {(osu) => (
          <form.AppField name="repository.currentArchiveLaboratory">
            {(field) => (
              <field.ComboboxField
                label={m.field_archive_laboratory()}
                items={toItems(
                  filterLaboratoriesByOrgAndOsu({ osu }),
                  laboratoryLabel,
                )}
                placeholder={m.laboratory_placeholder()}
                searchPlaceholder={m.laboratory_search_placeholder()}
                emptyText={m.laboratory_empty()}
              />
            )}
          </form.AppField>
        )}
      </form.Subscribe>

      <form.AppField name="repository.rightsHolder">
        {(field) => (
          <field.MultiComboboxField
            label={m.field_rights_holder()}
            items={ALL_ORGANIZATION_ITEMS}
            placeholder={m.organization_placeholder()}
            searchPlaceholder={m.organization_search_placeholder()}
            emptyText={m.organization_empty()}
            removeLabel={(label) => m.rights_holder_remove({ label })}
          />
        )}
      </form.AppField>

      <form.AppField name="repository.collectionName">
        {(field) => <field.TextField label={m.field_collection_name()} />}
      </form.AppField>

      <fieldset className="grid gap-4">
        <legend className="mb-2 font-medium">{m.legend_contact()}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField name="repository.currentArchiveContactFirstname">
            {(field) => <field.TextField label={m.field_firstname()} />}
          </form.AppField>

          <form.AppField name="repository.currentArchiveContactLastname">
            {(field) => <field.TextField label={m.field_lastname()} />}
          </form.AppField>
        </div>
      </fieldset>
    </FormSection>
  );
}
