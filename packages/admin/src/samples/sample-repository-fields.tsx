import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { ALL_ORGANIZATION_ITEMS } from "@projet-igsn/domain/institutional-group/managed-group-items";

import { m } from "#/paraglide/messages.js";
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

          <fieldset className="grid gap-4">
            <legend className="text-sm font-medium">
              {m.legend_contact()}
            </legend>
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
      </div>

      <div className="rounded-lg border p-4">
        <FormSection level={3} title={m.section_original_archive()}>
          <form.AppField name="repository.originalArchive">
            {(field) => (
              <field.TextField label={m.field_archive_organization()} />
            )}
          </form.AppField>

          <fieldset className="grid gap-4">
            <legend className="text-sm font-medium">
              {m.legend_contact()}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="repository.originalArchiveContactFirstname">
                {(field) => <field.TextField label={m.field_firstname()} />}
              </form.AppField>

              <form.AppField name="repository.originalArchiveContactLastname">
                {(field) => <field.TextField label={m.field_lastname()} />}
              </form.AppField>
            </div>
          </fieldset>
        </FormSection>
      </div>
    </div>
  );
}
