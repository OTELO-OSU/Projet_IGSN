import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { ALL_ORGANIZATION_ITEMS } from "@projet-igsn/domain/institutional-group/managed-group-items";
import { COLLECTION_ORIGINS } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import { PLATFORM_TYPES } from "@projet-igsn/domain/sample/scientific-context/platform-type";
import { RESEARCH_PROGRAM_KINDS } from "@projet-igsn/domain/sample/scientific-context/research-program-kind";

import { m } from "#/paraglide/messages.js";
import { ContactNameFields } from "#/samples/contact-name-fields.tsx";
import { SampleAdditionalRolesFields } from "#/samples/sample-additional-roles-fields.tsx";
import {
  collectionOriginLabel,
  platformTypeLabel,
  researchProgramDescriptionLabel,
  researchProgramKindLabel,
  researchProgramNameLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const collectionOriginItems = toComboboxItems(
  COLLECTION_ORIGINS,
  collectionOriginLabel,
);

const platformTypeItems = toComboboxItems(PLATFORM_TYPES, platformTypeLabel);

const researchProgramKindItems = toComboboxItems(
  RESEARCH_PROGRAM_KINDS,
  researchProgramKindLabel,
);

export function SampleScientificContextFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <form.Subscribe
        selector={(state) => state.values.scientificContext.provenanceStatus}
      >
        {(provenanceStatus) => {
          if (provenanceStatus === "research_project_sample") {
            return (
              <>
                <FormSection title={m.section_scientific_context()}>
                  <ContactNameFields
                    label={m.field_collector_name()}
                    person="scientificContext.collector"
                    selfFirst
                  />

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

                  <SampleAdditionalRolesFields />
                </FormSection>

                <FormSection title={m.section_funding()}>
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

                  <form.AppField name="scientificContext.funding">
                    {(field) => (
                      <field.TextField
                        label={m.field_funding()}
                        placeholder={m.funding_placeholder()}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="scientificContext.researchProgramKind">
                    {(field) => (
                      <field.ComboboxField
                        label={m.field_research_program_kind()}
                        items={researchProgramKindItems}
                        placeholder={m.research_program_kind_placeholder()}
                        searchPlaceholder={m.research_program_kind_search_placeholder()}
                        emptyText={m.research_program_kind_empty()}
                      />
                    )}
                  </form.AppField>

                  <form.Subscribe
                    selector={(state) => ({
                      kind: state.values.scientificContext.researchProgramKind,
                      hasProgram:
                        !!state.values.scientificContext.researchProgramName,
                    })}
                  >
                    {({ kind, hasProgram }) => (
                      <>
                        <form.AppField name="scientificContext.researchProgramName">
                          {(field) => (
                            <field.TextField
                              label={researchProgramNameLabel(kind)}
                              placeholder={m.research_program_name_placeholder()}
                            />
                          )}
                        </form.AppField>

                        <form.AppField name="scientificContext.researchProgramDescription">
                          {(field) => (
                            <field.TextField
                              label={researchProgramDescriptionLabel(kind)}
                              multiline
                              reveal={{
                                label: m.reveal_research_program_description(),
                                canReveal: hasProgram,
                              }}
                            />
                          )}
                        </form.AppField>
                      </>
                    )}
                  </form.Subscribe>
                </FormSection>

                <FormSection title={m.section_platform()}>
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
                      <field.TextField
                        label={m.field_launch_platform_name()}
                        placeholder={m.launch_platform_name_placeholder()}
                      />
                    )}
                  </form.AppField>
                </FormSection>
              </>
            );
          }
          if (provenanceStatus === "collection_specimen") {
            return (
              <FormSection title={m.section_scientific_context()}>
                <form.AppField name="scientificContext.collectionOrigin">
                  {(field) => (
                    <field.ComboboxField
                      label={m.field_collection_origin()}
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
                  selfFirst
                />

                <form.Subscribe
                  selector={(state) =>
                    !!state.values.scientificContext.collectionOrigin
                  }
                >
                  {(hasOrigin) => (
                    <form.AppField name="scientificContext.collectionContextDescription">
                      {(field) => (
                        <field.TextField
                          label={m.field_collection_context_description()}
                          multiline
                          reveal={{
                            label: m.reveal_collection_context_description(),
                            canReveal: hasOrigin,
                          }}
                        />
                      )}
                    </form.AppField>
                  )}
                </form.Subscribe>
              </FormSection>
            );
          }
          return null;
        }}
      </form.Subscribe>
    </div>
  );
}
