import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { COLLECTION_ORIGINS } from "@projet-igsn/domain/sample/scientific-context/collection-origin";
import { ORGANIZATIONS } from "@projet-igsn/domain/sample/scientific-context/organization";
import { organizationLabel } from "@projet-igsn/domain/sample/scientific-context/organization-label";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

import { m } from "#/paraglide/messages.js";
import { type ScientificContextDraft } from "#/samples/compose-scientific-context.ts";
import {
  collectionOriginLabel,
  provenanceStatusLabel,
} from "#/samples/sample-labels.ts";

// Organization names are proper nouns (reference data, not vocabulary), so the
// label comes from the domain list via organizationLabel, not the i18n catalog.
// Shared by the funder combobox and the research-structure multi-select.
const organizationItems = ORGANIZATIONS.map((organization) => ({
  value: organization.ror,
  label: organizationLabel(organization.ror),
}));

const provenanceStatusItems = toComboboxItems(
  PROVENANCE_STATUSES,
  provenanceStatusLabel,
);
const collectionOriginItems = toComboboxItems(
  COLLECTION_ORIGINS,
  collectionOriginLabel,
);

// The Scientific context tab. The provenance status is an exclusive choice
// switching between the recent-collection and historical-specimen field sets,
// so only the active branch renders (forms.md). The hidden branch keeps its
// values while editing, so switching back restores them; compose drops them
// on save and the post-save reset clears them (ADR 0015). Render inside a
// `form.AppForm`.
export function SampleScientificContextFields() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { scientificContext: ScientificContextDraft },
  });
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
                <form.AppField name="scientificContext.funderOrganization">
                  {(field) => (
                    <field.ComboboxField
                      label={m.field_funder_organization()}
                      requiredToPublish
                      items={organizationItems}
                      placeholder={m.organization_placeholder()}
                      searchPlaceholder={m.organization_search_placeholder()}
                      emptyText={m.organization_empty()}
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

                <form.AppField name="scientificContext.researchProgramChief">
                  {(field) => (
                    <field.TextField
                      label={m.field_research_program_chief()}
                      requiredToPublish
                    />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.researchProgramChiefOrcid">
                  {(field) => (
                    <field.TextField
                      label={m.field_research_program_chief_orcid()}
                    />
                  )}
                </form.AppField>

                <form.AppField name="scientificContext.researchStructure">
                  {(field) => (
                    <field.MultiComboboxField
                      label={m.field_research_structure()}
                      requiredToPublish
                      items={organizationItems}
                      placeholder={m.organization_placeholder()}
                      searchPlaceholder={m.organization_search_placeholder()}
                      emptyText={m.organization_empty()}
                      removeLabel={(label) =>
                        m.research_structure_remove({ label })
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
