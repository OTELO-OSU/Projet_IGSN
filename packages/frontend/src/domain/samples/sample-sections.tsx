import type { PublicSample } from "@projet-igsn/domain/sample/sample-validator";

import type { SampleSection } from "#/domain/samples/sample-section.ts";

import { AgeView, hasAge } from "#/domain/samples/age-view.tsx";
import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { classificationRubric } from "#/domain/samples/classification-rubric.tsx";
import { ConditionView } from "#/domain/samples/condition-view.tsx";
import { DescriptionView } from "#/domain/samples/description-view.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { identityRubric } from "#/domain/samples/identity-rubric.tsx";
import { LocationView } from "#/domain/samples/location-view.tsx";
import { RelationsView } from "#/domain/samples/relations-view.tsx";
import { RepositoryView } from "#/domain/samples/repository-view.tsx";
import {
  availabilityStatusLabel,
  existenceStatusLabel,
  physiographicEnvironmentLabel,
} from "#/domain/samples/sample-labels.ts";
import { ScientificContextView } from "#/domain/samples/scientific-context-view.tsx";
import { hasHazard, SecurityView } from "#/domain/samples/security-view.tsx";
import { SubSection } from "#/domain/samples/sub-section.tsx";
import { m } from "#/paraglide/messages.js";

export type PublishedSample = Extract<PublicSample, { status: "published" }>;

const hasValueBesides = (record: object, key: string): boolean =>
  Object.entries(record).some(
    ([name, value]) =>
      name !== key &&
      value != null &&
      !(Array.isArray(value) && value.length === 0),
  );

export function sampleSections(
  sample: PublishedSample,
  lineage: SampleSection | null,
): SampleSection[] {
  const {
    igsn,
    description,
    condition,
    scientificContext,
    repository,
    geologicalContextDescription,
    physiographicEnvironment,
    location,
    security,
    existenceStatus,
    availabilityStatus,
    age,
    relations,
    attachments,
  } = sample;
  const hasGeologicalContext =
    geologicalContextDescription != null || physiographicEnvironment != null;
  const hasCurationStatus =
    existenceStatus != null || availabilityStatus != null;
  return [
    identityRubric(sample),
    lineage,
    classificationRubric(sample),
    (location != null || hasGeologicalContext) && {
      id: "location",
      title: m.sample_section_location(),
      content: (
        <>
          {location && <LocationView location={location} />}
          {hasGeologicalContext && (
            <SubSection title={m.sample_section_geological_context()}>
              <FieldRows>
                <BreadcrumbFieldRow
                  id="sample-field-physiographic-environment"
                  label={m.sample_field_physiographic_environment()}
                  path={physiographicEnvironment}
                  pathLabel={physiographicEnvironmentLabel}
                />
                <FieldRow
                  label={m.sample_field_geological_context_description()}
                  value={geologicalContextDescription}
                />
              </FieldRows>
            </SubSection>
          )}
        </>
      ),
    },
    hasAge(age) && {
      id: "age",
      title: m.sample_section_age(),
      content: <AgeView age={age} />,
    },
    description &&
      hasValueBesides(description, "collectionDate") && {
        id: "physical-description",
        title: m.sample_section_physical_description(),
        content: <DescriptionView description={description} />,
      },
    scientificContext &&
      hasValueBesides(scientificContext, "provenanceStatus") && {
        id: "scientific-context",
        title: m.sample_section_scientific_context(),
        content: (
          <ScientificContextView scientificContext={scientificContext} />
        ),
      },
    (condition != null || hasHazard(security)) && {
      id: "conservation",
      title: m.sample_section_conservation(),
      content: (
        <>
          {condition && (
            <SubSection title={m.sample_section_condition()}>
              <ConditionView condition={condition} />
            </SubSection>
          )}
          {hasHazard(security) && (
            <SubSection title={m.sample_section_security()}>
              <SecurityView security={security} />
            </SubSection>
          )}
        </>
      ),
    },
    (hasCurationStatus || repository != null) && {
      id: "curation",
      title: m.sample_section_curation(),
      content: (
        <>
          {hasCurationStatus && (
            <FieldRows>
              <FieldRow
                label={m.sample_field_existence_status()}
                value={existenceStatus && existenceStatusLabel(existenceStatus)}
              />
              <FieldRow
                label={m.sample_field_availability_status()}
                value={
                  availabilityStatus &&
                  availabilityStatusLabel(availabilityStatus)
                }
              />
            </FieldRows>
          )}
          {repository && (
            <SubSection title={m.sample_section_repository()}>
              <RepositoryView repository={repository} />
            </SubSection>
          )}
        </>
      ),
    },
    igsn != null &&
      (relations.length > 0 || attachments.length > 0) && {
        id: "related-resources",
        title: m.sample_section_related_resources(),
        content: (
          <RelationsView
            igsn={igsn}
            relations={relations}
            attachments={attachments}
          />
        ),
      },
  ].filter((section) => section != null && section !== false);
}
