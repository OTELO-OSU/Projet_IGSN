import { ALL_ORGANIZATION_ITEMS } from "#/institutional-groups/to-items.ts";
import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SampleRepositoryFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <form.AppField name="repository.currentArchive">
        {(field) => (
          <field.ComboboxField
            label={m.field_current_archive()}
            requiredToPublish
            items={ALL_ORGANIZATION_ITEMS}
            placeholder={m.organization_placeholder()}
            searchPlaceholder={m.organization_search_placeholder()}
            emptyText={m.organization_empty()}
          />
        )}
      </form.AppField>

      <form.AppField name="repository.currentArchiveContact">
        {(field) => (
          <field.TextField label={m.field_current_archive_contact()} />
        )}
      </form.AppField>

      <form.AppField name="repository.collectionName">
        {(field) => <field.TextField label={m.field_collection_name()} />}
      </form.AppField>

      <form.AppField name="repository.originalArchive">
        {(field) => <field.TextField label={m.field_original_archive()} />}
      </form.AppField>

      <form.AppField name="repository.originalArchiveContact">
        {(field) => (
          <field.TextField label={m.field_original_archive_contact()} />
        )}
      </form.AppField>
    </div>
  );
}
