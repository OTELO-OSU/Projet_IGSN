import { FieldSuggestionCascadeProvider } from "@projet-igsn/design-system/components/form/field-suggestion-context";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { ALL_ORGANIZATION_ITEMS } from "@projet-igsn/domain/institutional-group/managed-group-items";
import { COLLECTION_ORIGINS } from "@projet-igsn/domain/sample/scientific-context/collection-origin";

import { m } from "#/paraglide/messages.js";
import { comboboxItemFormat } from "#/samples/combobox-item-format.ts";
import { collectionOriginLabel } from "#/samples/sample-labels.ts";
import { SuggestionOnlyRow } from "#/samples/suggestion-only-row.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const collectionOriginItems = toComboboxItems(
  COLLECTION_ORIGINS,
  collectionOriginLabel,
);

const PROVENANCE_GATE = ["scientificContext.provenanceStatus"];

const organizationFormat = comboboxItemFormat(ALL_ORGANIZATION_ITEMS);

const FIELD_SAMPLE_ONLY = [
  [
    "scientificContext.funderOrganizations",
    m.field_funder_organizations,
    organizationFormat,
  ],
  ["scientificContext.researchProgramName", m.field_research_program_name],
  ["scientificContext.chiefScientist", m.field_chief_scientist],
  ["scientificContext.chiefScientistOrcid", m.field_chief_scientist_orcid],
  [
    "scientificContext.hostInstitution",
    m.field_host_institution,
    organizationFormat,
  ],
  ["scientificContext.collectorOrcid", m.field_collector_orcid],
  ["scientificContext.researchCampaign", m.field_research_campaign],
  ["scientificContext.funding", m.field_funding],
  [
    "scientificContext.researchProgramDescription",
    m.field_research_program_description,
  ],
  ["scientificContext.fieldName", m.field_field_name],
  ["scientificContext.missionDescription", m.field_mission_description],
] as const;

const COLLECTION_SPECIMEN_ONLY = [
  ["scientificContext.collectionCurator", m.field_collection_curator],
  [
    "scientificContext.collectionOrigin",
    m.field_collection_origin,
    comboboxItemFormat(collectionOriginItems),
  ],
  [
    "scientificContext.collectionContextDescription",
    m.field_collection_context_description,
  ],
] as const;

function BranchSuggestionRows({
  fields,
}: {
  fields: typeof FIELD_SAMPLE_ONLY | typeof COLLECTION_SPECIMEN_ONLY;
}) {
  return fields.map(([name, label, format]) => (
    <SuggestionOnlyRow key={name} name={name} label={label()} format={format} />
  ));
}

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

                <form.AppField name="scientificContext.chiefScientist">
                  {(field) => (
                    <field.TextField label={m.field_chief_scientist()} />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.chiefScientistOrcid">
                  {(field) => (
                    <field.TextField label={m.field_chief_scientist_orcid()} />
                  )}
                </form.AppField>

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

                <form.AppField name="scientificContext.collectorName">
                  {(field) => (
                    <field.TextField
                      label={m.field_collector_name()}
                      requiredToPublish
                    />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.collectorOrcid">
                  {(field) => (
                    <field.TextField label={m.field_collector_orcid()} />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.researchCampaign">
                  {(field) => (
                    <field.TextField label={m.field_research_campaign()} />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.funding">
                  {(field) => <field.TextField label={m.field_funding()} />}
                </form.AppField>

                <form.AppField name="scientificContext.researchProgramDescription">
                  {(field) => (
                    <field.TextField
                      label={m.field_research_program_description()}
                      multiline
                    />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.fieldName">
                  {(field) => <field.TextField label={m.field_field_name()} />}
                </form.AppField>

                <form.AppField name="scientificContext.missionDescription">
                  {(field) => (
                    <field.TextField
                      label={m.field_mission_description()}
                      multiline
                    />
                  )}
                </form.AppField>

                <FieldSuggestionCascadeProvider value={PROVENANCE_GATE}>
                  <BranchSuggestionRows fields={COLLECTION_SPECIMEN_ONLY} />
                </FieldSuggestionCascadeProvider>
              </>
            );
          }
          if (provenanceStatus === "collection_specimen") {
            return (
              <>
                <form.AppField name="scientificContext.collectionCurator">
                  {(field) => (
                    <field.TextField
                      label={m.field_collection_curator()}
                      requiredToPublish
                    />
                  )}
                </form.AppField>

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

                <form.AppField name="scientificContext.collectorName">
                  {(field) => (
                    <field.TextField label={m.field_collector_name()} />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.collectionContextDescription">
                  {(field) => (
                    <field.TextField
                      label={m.field_collection_context_description()}
                      multiline
                    />
                  )}
                </form.AppField>

                <FieldSuggestionCascadeProvider value={PROVENANCE_GATE}>
                  <BranchSuggestionRows fields={FIELD_SAMPLE_ONLY} />
                </FieldSuggestionCascadeProvider>
              </>
            );
          }
          return null;
        }}
      </form.Subscribe>
    </div>
  );
}
