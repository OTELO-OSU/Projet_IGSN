import type { SampleAdditionalRole } from "@projet-igsn/domain/sample/additional-role/model";
import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

import { ADDITIONAL_ROLES } from "@projet-igsn/domain/sample/additional-role/role";
import { joinContactName } from "@projet-igsn/domain/sample/contact-name";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { OrcidLink } from "#/domain/samples/orcid-link.tsx";
import { OrgLinksRow } from "#/domain/samples/org-links-row.tsx";
import {
  additionalRoleLabel,
  collectionOriginLabel,
  platformTypeLabel,
  provenanceStatusLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

type FieldSample = Extract<
  ScientificContext,
  { provenanceStatus: "field_sample" }
>;
type CollectionSpecimen = Extract<
  ScientificContext,
  { provenanceStatus: "collection_specimen" }
>;

function AdditionalRoleRows({ roles }: { roles: SampleAdditionalRole[] }) {
  return ADDITIONAL_ROLES.map((role) => {
    const people = roles.filter((person) => person.role === role);
    return (
      <FieldRow
        key={role}
        label={additionalRoleLabel(role)}
        value={
          people.length > 0 && (
            <ul>
              {people.map((person, index) => (
                <li key={index}>
                  {joinContactName(
                    person.personFirstname,
                    person.personLastname,
                  )}
                  {person.personOrcid && (
                    <>
                      {" "}
                      <OrcidLink orcid={person.personOrcid} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      />
    );
  });
}

function FieldSampleRows({ context }: { context: FieldSample }) {
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
        value={joinContactName(
          context.chiefScientistFirstname,
          context.chiefScientistLastname,
        )}
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
        value={joinContactName(
          context.collectorFirstname,
          context.collectorLastname,
        )}
      />
      <FieldRow
        label={m.sample_field_collector_orcid()}
        value={
          context.collectorOrcid && <OrcidLink orcid={context.collectorOrcid} />
        }
      />
      <AdditionalRoleRows roles={context.additionalRoles} />
      <FieldRow label={m.sample_field_funding()} value={context.funding} />
      <FieldRow
        label={m.sample_field_research_program_description()}
        value={context.researchProgramDescription}
      />
      <FieldRow
        label={m.sample_field_platform_type()}
        value={context.platformType && platformTypeLabel(context.platformType)}
      />
      <FieldRow
        label={m.sample_field_launch_platform_name()}
        value={context.launchPlatformName}
      />
    </>
  );
}

function CollectionSpecimenRows({ context }: { context: CollectionSpecimen }) {
  return (
    <>
      <FieldRow
        label={m.sample_field_collection_curator()}
        value={joinContactName(
          context.collectionCuratorFirstname,
          context.collectionCuratorLastname,
        )}
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
        value={joinContactName(
          context.collectorFirstname,
          context.collectorLastname,
        )}
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
      {scientificContext.provenanceStatus === "field_sample" ? (
        <FieldSampleRows context={scientificContext} />
      ) : (
        <CollectionSpecimenRows context={scientificContext} />
      )}
    </FieldRows>
  );
}
