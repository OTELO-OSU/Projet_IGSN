import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { ALL_ORGANIZATION_ITEMS } from "@projet-igsn/domain/institutional-group/managed-group-items";

import { m } from "#/paraglide/messages.js";
import { PersonNameFields } from "#/samples/person-name-fields.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleRepositoryFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-6">
      <div className="rounded-lg border p-4">
        <FormSection level={3} title={m.section_current_archive()}>
          <form.AppField name="repository.currentArchive">
            {(field) => (
              <field.ComboboxField
                label={m.field_archive_organization()}
                items={ALL_ORGANIZATION_ITEMS}
                placeholder={m.organization_placeholder()}
                searchPlaceholder={m.organization_search_placeholder()}
                emptyText={m.organization_empty()}
              />
            )}
          </form.AppField>

          <form.AppField name="repository.collectionName">
            {(field) => <field.TextField label={m.field_collection_name()} />}
          </form.AppField>

          <PersonNameFields
            legend={m.legend_contact()}
            person="repository.currentArchiveContact"
          />
        </FormSection>
      </div>

      <div className="rounded-lg border p-4">
        <FormSection level={3} title={m.section_original_archive()}>
          <form.AppField name="repository.originalArchive">
            {(field) => (
              <field.TextField label={m.field_archive_organization()} />
            )}
          </form.AppField>

          <PersonNameFields
            legend={m.legend_contact()}
            person="repository.originalArchiveContact"
          />
        </FormSection>
      </div>
    </div>
  );
}
