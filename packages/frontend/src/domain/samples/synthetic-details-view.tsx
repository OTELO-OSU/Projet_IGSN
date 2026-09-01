import type { SyntheticDetails } from "@projet-igsn/domain/sample/synthetic-details/model";

import { pressureUnitLabel } from "@projet-igsn/domain/sample/condition/pressure-unit";
import { temperatureUnitLabel } from "@projet-igsn/domain/sample/condition/temperature-unit";
import { experimentDurationUnitLabel } from "@projet-igsn/domain/sample/synthetic-details/experiment-duration-unit";

import { dateRangeText } from "#/domain/samples/date-range-text.ts";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { OrcidLink } from "#/domain/samples/orcid-link.tsx";
import { OrgLinksRow } from "#/domain/samples/org-links-row.tsx";
import {
  experimentTypeLabel,
  finalProductLabel,
  startingMaterialFormLabel,
  startingMaterialNatureLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

const measurementText = <Unit extends string>(
  { value, unit }: { value: number; unit: Unit },
  labels: Record<Unit, string>,
): string => `${value} ${labels[unit]}`;

export function SyntheticDetailsView({
  syntheticDetails,
}: {
  syntheticDetails: SyntheticDetails;
}) {
  const {
    startingMaterialNature,
    startingMaterialForm,
    startingMaterialComposition,
    finalProduct,
    experimentType,
    experimentDuration,
    experimentDurationNotRelevant,
    synthesisDate,
    operatorName,
    operatorOrcid,
    researchStructure,
    temperature,
    pressure,
    experimentalProtocol,
    experimentPurpose,
    equipmentUsed,
  } = syntheticDetails;
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_starting_material_nature()}
        value={
          startingMaterialNature &&
          startingMaterialNatureLabel(startingMaterialNature)
        }
      />
      <FieldRow
        label={m.sample_field_starting_material_form()}
        value={
          startingMaterialForm &&
          startingMaterialFormLabel(startingMaterialForm)
        }
      />
      <FieldRow
        label={m.sample_field_starting_material_composition()}
        value={startingMaterialComposition}
      />
      <FieldRow
        label={m.sample_field_final_product()}
        value={finalProduct && finalProductLabel(finalProduct)}
      />
      <FieldRow
        label={m.sample_field_experiment_type()}
        value={experimentType && experimentTypeLabel(experimentType)}
      />
      <FieldRow
        label={m.sample_field_experiment_duration()}
        value={
          experimentDuration
            ? measurementText(experimentDuration, experimentDurationUnitLabel)
            : experimentDurationNotRelevant &&
              m.sample_experiment_duration_not_relevant()
        }
      />
      <FieldRow
        label={m.sample_field_synthesis_date()}
        value={synthesisDate && dateRangeText(synthesisDate)}
      />
      <FieldRow label={m.sample_field_operator_name()} value={operatorName} />
      <FieldRow
        label={m.sample_field_operator_orcid()}
        value={operatorOrcid && <OrcidLink orcid={operatorOrcid} />}
      />
      <OrgLinksRow
        label={m.sample_field_synthesis_research_structure()}
        rors={researchStructure}
      />
      <FieldRow
        label={m.sample_field_temperature()}
        value={
          temperature && measurementText(temperature, temperatureUnitLabel)
        }
      />
      <FieldRow
        label={m.sample_field_pressure()}
        value={pressure && measurementText(pressure, pressureUnitLabel)}
      />
      <FieldRow
        label={m.sample_field_experimental_protocol()}
        value={experimentalProtocol}
      />
      <FieldRow
        label={m.sample_field_experiment_purpose()}
        value={experimentPurpose}
      />
      <FieldRow label={m.sample_field_equipment_used()} value={equipmentUsed} />
    </FieldRows>
  );
}
