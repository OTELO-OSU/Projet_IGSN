import type { SyntheticDetails } from "@projet-igsn/domain/sample/synthetic-details/model";

export function syntheticDetailsColumns(
  details: SyntheticDetails | null | undefined,
) {
  return {
    syn_starting_material: details?.startingMaterial ?? null,
    syn_starting_material_nature: details?.startingMaterialNature ?? null,
    syn_starting_material_composition:
      details?.startingMaterialComposition ?? null,
    syn_final_product: details?.finalProduct ?? null,
    syn_experiment_type: details?.experimentType ?? null,
    syn_experiment_duration_value: details?.experimentDuration?.value ?? null,
    syn_experiment_duration_unit: details?.experimentDuration?.unit ?? null,
    syn_experiment_duration_not_relevant:
      details?.experimentDurationNotRelevant ?? null,
    syn_synthesis_date_start: details?.synthesisDate?.start ?? null,
    syn_synthesis_date_end: details?.synthesisDate?.end ?? null,
    syn_operator_name: details?.operatorName ?? null,
    syn_operator_orcid: details?.operatorOrcid ?? null,
    syn_research_structure: details?.researchStructure ?? null,
    syn_temperature_value: details?.temperature?.value ?? null,
    syn_temperature_unit: details?.temperature?.unit ?? null,
    syn_pressure_value: details?.pressure?.value ?? null,
    syn_pressure_unit: details?.pressure?.unit ?? null,
    syn_experimental_protocol: details?.experimentalProtocol ?? null,
    syn_experiment_purpose: details?.experimentPurpose ?? null,
    syn_equipment_used: details?.equipmentUsed ?? null,
  };
}
