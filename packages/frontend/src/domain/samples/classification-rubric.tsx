import { hasEconomicInterest } from "@projet-igsn/domain/sample/resource-type/has-economic-interest";

import type { SampleSection } from "#/domain/samples/sample-section.ts";
import type { PublishedSample } from "#/domain/samples/sample-sections.tsx";

import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { EconomicInterestView } from "#/domain/samples/economic-interest-view.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { MineralClassificationsView } from "#/domain/samples/mineral-classifications-view.tsx";
import {
  materialPathLabel,
  metamorphicFabricLabel,
  metamorphicFaciesLabel,
  textureLabel,
} from "#/domain/samples/sample-labels.ts";
import { SubSection } from "#/domain/samples/sub-section.tsx";
import { SyntheticDetailsView } from "#/domain/samples/synthetic-details-view.tsx";
import { m } from "#/paraglide/messages.js";

export function classificationRubric({
  material,
  texture,
  metamorphicFacies,
  metamorphicFabric,
  specificName,
  mineralClassifications,
  syntheticDetails,
  resourceType,
  economicInterestElements,
  economicResourceTypePrecision,
  economicDepositName,
  economicDepositDescription,
}: PublishedSample): SampleSection | null {
  const economicInterest = {
    resourceType,
    economicInterestElements,
    economicResourceTypePrecision,
    economicDepositName,
    economicDepositDescription,
  };
  const hasRows = [
    material,
    texture,
    metamorphicFacies,
    metamorphicFabric,
    specificName,
  ].some((value) => value != null);
  const hasEconomic = hasEconomicInterest(economicInterest);
  if (
    !hasRows &&
    mineralClassifications.length === 0 &&
    !hasEconomic &&
    syntheticDetails == null
  ) {
    return null;
  }
  return {
    id: "classification",
    title: m.sample_section_classification(),
    content: (
      <>
        {hasRows && (
          <FieldRows>
            <BreadcrumbFieldRow
              id="sample-field-material"
              label={m.sample_field_material()}
              path={material}
              pathLabel={materialPathLabel}
            />
            <FieldRow
              label={m.sample_field_texture()}
              value={texture && textureLabel(texture)}
            />
            <FieldRow
              label={m.sample_field_metamorphic_facies()}
              value={
                metamorphicFacies && metamorphicFaciesLabel(metamorphicFacies)
              }
            />
            <FieldRow
              label={m.sample_field_metamorphic_fabric()}
              value={
                metamorphicFabric && metamorphicFabricLabel(metamorphicFabric)
              }
            />
            <FieldRow
              label={m.sample_field_specific_name()}
              value={specificName}
            />
          </FieldRows>
        )}
        {mineralClassifications.length > 0 && (
          <SubSection title={m.sample_section_mineral_classifications()}>
            <MineralClassificationsView
              mineralClassifications={mineralClassifications}
            />
          </SubSection>
        )}
        {hasEconomic && (
          <SubSection title={m.sample_section_economic_interest()}>
            <EconomicInterestView {...economicInterest} />
          </SubSection>
        )}
        {syntheticDetails && (
          <SubSection title={m.sample_section_synthetic_details()}>
            <SyntheticDetailsView syntheticDetails={syntheticDetails} />
          </SubSection>
        )}
      </>
    ),
  };
}
