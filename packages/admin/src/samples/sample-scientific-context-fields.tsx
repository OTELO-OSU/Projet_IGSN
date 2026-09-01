import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { COLLECTION_ORIGINS } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import { ALL_ORGANIZATION_ITEMS } from "#/institutional-groups/to-items.ts";
import { m } from "#/paraglide/messages.js";
import { organizationItems } from "#/samples/organization-items.ts";
import {
  collectionOriginLabel,
  provenanceStatusLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const provenanceStatusItems = toComboboxItems(
  PROVENANCE_STATUSES,
  provenanceStatusLabel,
);
const collectionOriginItems = toComboboxItems(
  COLLECTION_ORIGINS,
  collectionOriginLabel,
);

export function SampleScientificContextFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      <form.AppField name="scientificContext.provenanceStatus">
        {(field) => (
          <field.ComboboxField
            label={m.field_provenance_status()}
            requiredToPublish
            items={provenanceStatusItems}
            placeholder={m.provenance_status_placeholder()}
            searchPlaceholder={m.provenance_status_search_placeholder()}
            emptyText={m.provenance_status_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => state.values.scientificContext.provenanceStatus}
      >
        {(provenanceStatus) => {
          if (provenanceStatus === "recent_collection") {
            return (
              <>
                <form.AppField name="scientificContext.funderOrganizations">
                  {(field) => (
                    <field.MultiComboboxField
                      label={m.field_funder_organizations()}
                      requiredToPublish
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
                    <field.TextField
                      label={m.field_research_program_name()}
                      requiredToPublish
                    />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.chiefScientist">
                  {(field) => (
                    <field.TextField
                      label={m.field_chief_scientist()}
                      requiredToPublish
                    />
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
                      requiredToPublish
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
              </>
            );
          }
          if (provenanceStatus === "historical_specimen") {
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
              </>
            );
          }
          return null;
        }}
      </form.Subscribe>
    </div>
  );
}
