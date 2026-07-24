import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";
import { organizationLabel } from "@projet-igsn/domain/sample/scientific-context/organization-label";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
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

// A ROR id shown as its organization name, linked to its ror.org record. ROR
// and the org name are reference data, so the name comes from the domain list.
function OrgLink({ ror }: { ror: string }) {
  return (
    <ExternalLink href={`https://ror.org/${ror}`}>
      {organizationLabel(ror)}
    </ExternalLink>
  );
}

// An ORCID iD linked to its orcid.org record.
function OrcidLink({ orcid }: { orcid: string }) {
  return (
    <ExternalLink href={`https://orcid.org/${orcid}`}>{orcid}</ExternalLink>
  );
}

function RecentCollectionRows({ context }: { context: RecentCollection }) {
  return (
    <>
      <FieldRow
        label={m.sample_field_funder_organization()}
        value={
          context.funderOrganization && (
            <OrgLink ror={context.funderOrganization} />
          )
        }
      />
      <FieldRow
        label={m.sample_field_research_program_name()}
        value={context.researchProgramName}
      />
      <FieldRow
        label={m.sample_field_research_program_chief()}
        value={context.researchProgramChief}
      />
      <FieldRow
        label={m.sample_field_research_program_chief_orcid()}
        value={
          context.researchProgramChiefOrcid && (
            <OrcidLink orcid={context.researchProgramChiefOrcid} />
          )
        }
      />
      <FieldRow
        label={m.sample_field_research_structure()}
        value={
          context.researchStructure?.length ? (
            <ul className="flex flex-col gap-1">
              {context.researchStructure.map((ror) => (
                <li key={ror}>
                  <OrgLink ror={ror} />
                </li>
              ))}
            </ul>
          ) : null
        }
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

// The scientific-context rows of the sample detail page. The context is a
// discriminated union on provenance status, so the two branches share only the
// status row; FieldRow drops any field the sample lacks (the parent hides the
// whole section when the sample has no context at all).
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
