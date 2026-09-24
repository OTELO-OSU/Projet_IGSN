import type { PublicSample } from "@projet-igsn/domain/sample/sample-validator";

import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { hasEconomicInterest } from "@projet-igsn/domain/sample/resource-type/has-economic-interest";

import type { SampleSection } from "#/domain/samples/sample-section.ts";

import { AgeView, hasAge } from "#/domain/samples/age-view.tsx";
import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { ConditionView } from "#/domain/samples/condition-view.tsx";
import { DescriptionView } from "#/domain/samples/description-view.tsx";
import { EconomicInterestView } from "#/domain/samples/economic-interest-view.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { LazySampleLocationMap } from "#/domain/samples/lazy-sample-location-map.tsx";
import { LocationView } from "#/domain/samples/location-view.tsx";
import { ProcessStepsView } from "#/domain/samples/process-steps-view.tsx";
import { RelationsView } from "#/domain/samples/relations-view.tsx";
import { RepositoryView } from "#/domain/samples/repository-view.tsx";
import {
  availabilityStatusLabel,
  collectionMethodLabel,
  existenceStatusLabel,
  materialPathLabel,
  metamorphicFabricLabel,
  metamorphicFaciesLabel,
  natureLabel,
  physiographicEnvironmentLabel,
  textureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { ScientificContextView } from "#/domain/samples/scientific-context-view.tsx";
import { SecurityView } from "#/domain/samples/security-view.tsx";
import { SyntheticDetailsView } from "#/domain/samples/synthetic-details-view.tsx";
import { m } from "#/paraglide/messages.js";

export type PublishedSample = Extract<PublicSample, { status: "published" }>;

export function sampleSections(
  {
    igsn,
    nature,
    type,
    material,
    materialOtherName,
    texture,
    metamorphicFacies,
    metamorphicFabric,
    specificName,
    localId,
    localIdDescription,
    collectionMethod,
    collectionMethodDescription,
    description,
    condition,
    scientificContext,
    repository,
    geologicalContextDescription,
    physiographicEnvironment,
    syntheticDetails,
    processSteps,
    institutionalOrganization,
    institutionalOsu,
    institutionalLaboratory,
    manualGroups,
    parents,
    location,
    security,
    existenceStatus,
    availabilityStatus,
    publicationYear,
    age,
    relations,
    attachments,
    resourceType,
    economicInterestElements,
    economicResourceTypePrecision,
    economicDepositName,
    economicDepositDescription,
  }: PublishedSample,
  lineage: SampleSection | null,
): SampleSection[] {
  // A sub-sample's collection date is its parents', not information about itself (ADR 0045).
  const shownDescription =
    description && parents.length > 0
      ? { ...description, collectionDate: null }
      : description;
  const sampleRows = (
    <FieldRows>
      <FieldRow
        label={m.sample_field_nature()}
        value={nature ? natureLabel(nature) : null}
      />
      <BreadcrumbFieldRow
        id="sample-field-type"
        label={m.sample_field_type()}
        path={type}
        pathLabel={typeLabel}
      />
      <BreadcrumbFieldRow
        id="sample-field-material"
        label={m.sample_field_material()}
        path={material}
        pathLabel={materialPathLabel}
        suffix={materialOtherName}
      />
      <FieldRow
        label={m.sample_field_texture()}
        value={texture && textureLabel(texture)}
      />
      <FieldRow
        label={m.sample_field_metamorphic_facies()}
        value={metamorphicFacies && metamorphicFaciesLabel(metamorphicFacies)}
      />
      <FieldRow
        label={m.sample_field_metamorphic_fabric()}
        value={metamorphicFabric && metamorphicFabricLabel(metamorphicFabric)}
      />
      <FieldRow label={m.sample_field_specific_name()} value={specificName} />
      <FieldRow label={m.sample_field_local_id()} value={localId} />
      <FieldRow
        label={m.sample_field_local_id_description()}
        value={localIdDescription}
      />
      <BreadcrumbFieldRow
        id="sample-field-collection-method"
        label={m.sample_field_collection_method()}
        path={collectionMethod}
        pathLabel={collectionMethodLabel}
      />
      <FieldRow
        label={m.sample_field_collection_method_description()}
        value={collectionMethodDescription}
      />
      <FieldRow
        label={m.sample_field_existence_status()}
        value={existenceStatus && existenceStatusLabel(existenceStatus)}
      />
      <FieldRow
        label={m.sample_field_availability_status()}
        value={
          availabilityStatus && availabilityStatusLabel(availabilityStatus)
        }
      />
      <FieldRow
        label={m.sample_field_publication_year()}
        value={publicationYear}
      />
    </FieldRows>
  );
  return [
    {
      id: "sample",
      title: m.sample_section_sample(),
      content: location?.position ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sampleRows}
          <LazySampleLocationMap position={location.position} />
        </div>
      ) : (
        sampleRows
      ),
    },
    shownDescription &&
      Object.values(shownDescription).some((value) => value != null) && {
        id: "description",
        title: m.sample_section_description(),
        content: <DescriptionView description={shownDescription} />,
      },
    location && {
      id: "location",
      title: m.sample_section_location(),
      content: <LocationView location={location} />,
    },
    (geologicalContextDescription != null ||
      physiographicEnvironment != null) && {
      id: "geological-context",
      title: m.sample_section_geological_context(),
      content: (
        <FieldRows>
          <FieldRow
            label={m.sample_field_geological_context_description()}
            value={geologicalContextDescription}
          />
          <BreadcrumbFieldRow
            id="sample-field-physiographic-environment"
            label={m.sample_field_physiographic_environment()}
            path={physiographicEnvironment}
            pathLabel={physiographicEnvironmentLabel}
          />
        </FieldRows>
      ),
    },
    condition && {
      id: "condition",
      title: m.sample_section_condition(),
      content: <ConditionView condition={condition} />,
    },
    scientificContext && {
      id: "scientific-context",
      title: m.sample_section_scientific_context(),
      content: <ScientificContextView scientificContext={scientificContext} />,
    },
    repository && {
      id: "repository",
      title: m.sample_section_repository(),
      content: <RepositoryView repository={repository} />,
    },
    syntheticDetails && {
      id: "synthetic-details",
      title: m.sample_section_synthetic_details(),
      content: <SyntheticDetailsView syntheticDetails={syntheticDetails} />,
    },
    processSteps.length > 0 && {
      id: "process-steps",
      title: m.sample_section_process_steps(),
      content: <ProcessStepsView processSteps={processSteps} />,
    },
    institutionalOrganization !== null && {
      id: "institution",
      title: m.sample_section_institution(),
      content: (
        <FieldRows>
          <FieldRow
            label={m.sample_field_institutional_organization()}
            value={organizationLabel(institutionalOrganization)}
          />
          <FieldRow
            label={m.sample_field_institutional_osu()}
            value={institutionalOsu && osuLabel(institutionalOsu)}
          />
          <FieldRow
            label={m.sample_field_institutional_laboratory()}
            value={
              institutionalLaboratory &&
              laboratoryLabel(institutionalLaboratory)
            }
          />
        </FieldRows>
      ),
    },
    manualGroups.length > 0 && {
      id: "manual-groups",
      title: m.sample_section_manual_groups(),
      content: (
        <ul className="mt-2 divide-y">
          {manualGroups.map(({ id, name }) => (
            <li key={id} className="px-4 py-3 font-medium">
              {name}
            </li>
          ))}
        </ul>
      ),
    },
    lineage,
    hasAge(age)
      ? {
          id: "age",
          title: m.sample_section_age(),
          content: <AgeView age={age} />,
        }
      : null,
    security && {
      id: "security",
      title: m.sample_section_security(),
      content: <SecurityView security={security} />,
    },
    hasEconomicInterest({
      resourceType,
      economicInterestElements,
      economicResourceTypePrecision,
      economicDepositName,
      economicDepositDescription,
    }) && {
      id: "economic-interest",
      title: m.sample_section_economic_interest(),
      content: (
        <EconomicInterestView
          resourceType={resourceType}
          economicInterestElements={economicInterestElements}
          economicResourceTypePrecision={economicResourceTypePrecision}
          economicDepositName={economicDepositName}
          economicDepositDescription={economicDepositDescription}
        />
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
