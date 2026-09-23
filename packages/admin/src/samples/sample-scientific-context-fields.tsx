import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { ALL_ORGANIZATION_ITEMS } from "@projet-igsn/domain/institutional-group/managed-group-items";
import { COLLECTION_ORIGINS } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import { PLATFORM_TYPES } from "@projet-igsn/domain/sample/scientific-context/platform-type";

import { m } from "#/paraglide/messages.js";
import { ContactNameFields } from "#/samples/contact-name-fields.tsx";
import { SampleAdditionalRolesFields } from "#/samples/sample-additional-roles-fields.tsx";
import {
  collectionOriginLabel,
  platformTypeLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const collectionOriginItems = toComboboxItems(
  COLLECTION_ORIGINS,
  collectionOriginLabel,
);

const platformTypeItems = toComboboxItems(PLATFORM_TYPES, platformTypeLabel);

export function SampleScientificContextFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <form.Subscribe
        selector={(state) => state.values.scientificContext.provenanceStatus}
      >
        {(provenanceStatus) => {
          if (provenanceStatus === "field_sample") {
            return (
              <>
                <form.AppField name="scientificContext.funderOrganizations">
                  {(field) => (
                    <field.MultiComboboxField
                      label={m.field_funder_organizations()}
                      items={ALL_ORGANIZATION_ITEMS}
                      placeholder={m.organization_placeholder()}
                      searchPlaceholder={m.organization_search_placeholder()}
                      emptyText={m.organization_empty()}
                      removeLabel={(label) =>
                        m.funder_organizations_remove({ label })
                      }
                    />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.researchProgramName">
                  {(field) => (
                    <field.TextField label={m.field_research_program_name()} />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.researchProgramDescription">
                  {(field) => (
                    <field.TextField
                      label={m.field_research_program_description()}
                      multiline
                    />
                  )}
                </form.AppField>

                <ContactNameFields
                  label={m.field_chief_scientist()}
                  person="scientificContext.chiefScientist"
                />

                <form.AppField name="scientificContext.hostInstitution">
                  {(field) => (
                    <field.MultiComboboxField
                      label={m.field_host_institution()}
                      items={ALL_ORGANIZATION_ITEMS}
                      placeholder={m.organization_placeholder()}
                      searchPlaceholder={m.organization_search_placeholder()}
                      emptyText={m.organization_empty()}
                      removeLabel={(label) =>
                        m.host_institution_remove({ label })
                      }
                    />
                  )}
                </form.AppField>

                <ContactNameFields
                  label={m.field_collector_name()}
                  person="scientificContext.collector"
                  requiredToPublish
                />
                <SampleAdditionalRolesFields />

                <form.AppField name="scientificContext.funding">
                  {(field) => <field.TextField label={m.field_funding()} />}
                </form.AppField>

                <form.AppField name="scientificContext.platformType">
                  {(field) => (
                    <field.ComboboxField
                      label={m.field_platform_type()}
                      items={platformTypeItems}
                      placeholder={m.platform_type_placeholder()}
                      searchPlaceholder={m.platform_type_search_placeholder()}
                      emptyText={m.platform_type_empty()}
                    />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.launchPlatformName">
                  {(field) => (
                    <field.TextField label={m.field_launch_platform_name()} />
                  )}
                </form.AppField>
              </>
            );
          }
          if (provenanceStatus === "collection_specimen") {
            return (
              <>
                <ContactNameFields
                  label={m.field_collection_curator()}
                  person="scientificContext.collectionCurator"
                  requiredToPublish
                />

                <form.AppField name="scientificContext.collectionOrigin">
                  {(field) => (
                    <field.ComboboxField
                      label={m.field_collection_origin()}
                      requiredToPublish
                      items={collectionOriginItems}
                      placeholder={m.collection_origin_placeholder()}
                      searchPlaceholder={m.collection_origin_search_placeholder()}
                      emptyText={m.collection_origin_empty()}
                    />
                  )}
                </form.AppField>

                <ContactNameFields
                  label={m.field_collector_name()}
                  person="scientificContext.collector"
                />

                <form.AppField name="scientificContext.collectionContextDescription">
                  {(field) => (
                    <field.TextField
                      label={m.field_collection_context_description()}
                      multiline
                    />
                  )}
                </form.AppField>
              </>
            );
          }
          return null;
        }}
      </form.Subscribe>
    </div>
  );
}
