import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { OrcidLink } from "#/domain/samples/orcid-link.tsx";
import { OrgLinksRow } from "#/domain/samples/org-links-row.tsx";
import {
  collectionOriginLabel,
  provenanceStatusLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

type RecentCollection = Extract<
  ScientificContext,
  { provenanceStatus: "recent_collection" }
>;
type HistoricalSpecimen = Extract<
  ScientificContext,
  { provenanceStatus: "historical_specimen" }
>;

function RecentCollectionRows({ context }: { context: RecentCollection }) {
  return (
    <>
      <OrgLinksRow
        label={m.sample_field_funder_organizations()}
        rors={context.funderOrganizations}
      />
      <FieldRow
        label={m.sample_field_research_program_name()}
        value={context.researchProgramName}
      />
      <FieldRow
        label={m.sample_field_chief_scientist()}
        value={context.chiefScientist}
      />
      <FieldRow
        label={m.sample_field_chief_scientist_orcid()}
        value={
          context.chiefScientistOrcid && (
            <OrcidLink orcid={context.chiefScientistOrcid} />
          )
        }
      />
      <OrgLinksRow
        label={m.sample_field_host_institution()}
        rors={context.hostInstitution}
      />
      <FieldRow
        label={m.sample_field_collector_name()}
        value={context.collectorName}
      />
      <FieldRow
        label={m.sample_field_collector_orcid()}
        value={
          context.collectorOrcid && <OrcidLink orcid={context.collectorOrcid} />
        }
      />
      <FieldRow
        label={m.sample_field_research_campaign()}
        value={context.researchCampaign}
      />
      <FieldRow label={m.sample_field_funding()} value={context.funding} />
      <FieldRow
        label={m.sample_field_research_program_description()}
        value={context.researchProgramDescription}
      />
      <FieldRow label={m.sample_field_field_name()} value={context.fieldName} />
      <FieldRow
        label={m.sample_field_mission_description()}
        value={context.missionDescription}
      />
    </>
  );
}

function HistoricalSpecimenRows({ context }: { context: HistoricalSpecimen }) {
  return (
    <>
      <FieldRow
        label={m.sample_field_collection_curator()}
        value={context.collectionCurator}
      />
      <FieldRow
        label={m.sample_field_collection_origin()}
        value={
          context.collectionOrigin &&
          collectionOriginLabel(context.collectionOrigin)
        }
      />
      <FieldRow
        label={m.sample_field_collector_name()}
        value={context.collectorName}
      />
      <FieldRow
        label={m.sample_field_collection_context_description()}
        value={context.collectionContextDescription}
      />
    </>
  );
}

export function ScientificContextView({
  scientificContext,
}: {
  scientificContext: ScientificContext;
}) {
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_provenance_status()}
        value={provenanceStatusLabel(scientificContext.provenanceStatus)}
      />
      {scientificContext.provenanceStatus === "recent_collection" ? (
        <RecentCollectionRows context={scientificContext} />
      ) : (
        <HistoricalSpecimenRows context={scientificContext} />
      )}
    </FieldRows>
  );
}
