import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { Selectable } from "kysely";

import { formatDate } from "@projet-igsn/domain/date/format-date";
import { type Sample, sampleSchema } from "@projet-igsn/domain/sample/sample";
import { scientificContextSchema } from "@projet-igsn/domain/sample/scientific-context/model";

import type { DB } from "../../db.ts";

import { toLocation } from "./to-location.ts";

function measurement(value: number | null, unit: string | null) {
  return value !== null && unit !== null ? { value, unit } : null;
}

function prune(parts: Record<string, unknown>) {
  const kept = omitNull(parts);
  return Object.keys(kept).length > 0 ? kept : null;
}

function omitNull(parts: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(parts).filter(([, part]) => part !== null),
  );
}

function toDescription(row: Selectable<DB["sample"]>) {
  return prune({
    collectionDate:
      row.collection_date_start !== null && row.collection_date_end !== null
        ? {
            start: formatDate(row.collection_date_start),
            end: formatDate(row.collection_date_end),
          }
        : null,
    oriented: row.oriented,
    orientationExplanation: row.orientation_explanation,
    openDescription: row.open_description,
    length: measurement(row.length_value, row.length_unit),
    width: measurement(row.width_value, row.width_unit),
    thickness: measurement(row.thickness_value, row.thickness_unit),
    mass: measurement(row.mass_value, row.mass_unit),
    volume: measurement(row.volume_value, row.volume_unit),
  });
}

function toCondition(row: Selectable<DB["sample"]>) {
  return prune({
    packaging: row.packaging,
    storageConditions: row.storage_conditions,
    temperature:
      row.temperature_type === null
        ? null
        : prune({
            type: row.temperature_type,
            measurement: measurement(
              row.temperature_value,
              row.temperature_unit,
            ),
          }),
    humidity:
      row.humidity_type === null
        ? null
        : prune({
            type: row.humidity_type,
            percentage: row.humidity_percentage,
          }),
    light: row.light,
    pressure:
      row.pressure_type === null
        ? null
        : prune({
            type: row.pressure_type,
            measurement: measurement(row.pressure_value, row.pressure_unit),
          }),
    specificConditions: row.specific_conditions,
  });
}

function toSecurity(row: Selectable<DB["sample"]>) {
  return prune({
    radioactivity: row.radioactivity,
    radioactivityExplanation: row.radioactivity_explanation,
    asbestosRich: row.asbestos_rich,
    asbestosExplanation: row.asbestos_explanation,
    chemicalRisk: row.chemical_risk,
    chemicalRiskExplanation: row.chemical_risk_explanation,
  });
}

function toScientificContext(row: Selectable<DB["sample"]>) {
  if (row.sc_provenance_status === "recent_collection") {
    return scientificContextSchema.parse({
      provenanceStatus: "recent_collection",
      ...omitNull({
        funderOrganizations: row.sc_funder_organizations,
        researchProgramName: row.sc_research_program_name,
        researchProgramChief: row.sc_research_program_chief,
        researchProgramChiefOrcid: row.sc_research_program_chief_orcid,
        researchStructure: row.sc_research_structure,
        collectorName: row.sc_collector_name,
        collectorOrcid: row.sc_collector_orcid,
        researchCampaign: row.sc_research_campaign,
        funding: row.sc_funding,
        researchProgramDescription: row.sc_research_program_description,
        fieldName: row.sc_field_name,
        missionDescription: row.sc_mission_description,
      }),
    });
  }
  if (row.sc_provenance_status === "historical_specimen") {
    return scientificContextSchema.parse({
      provenanceStatus: "historical_specimen",
      ...omitNull({
        collectionCurator: row.sc_collection_curator,
        collectionOrigin: row.sc_collection_origin,
        collectorName: row.sc_collector_name,
        collectionContextDescription: row.sc_collection_context_description,
      }),
    });
  }
  return null;
}

export function toSample(
  row: Selectable<DB["sample"]>,
  links: Selectable<DB["sample_link"]>[] = [],
  attachments: Selectable<DB["sample_attachment"]>[] = [],
  manualGroups: ManualGroup[] = [],
): Sample {
  const ageColumns = [
    row.numeric_age_min,
    row.numeric_age_max,
    row.numeric_age_unit,
    row.numeric_age_years_unit,
    row.geological_age_min,
    row.geological_age_max,
    row.geological_unit,
  ];
  const age = ageColumns.every((value) => value === null)
    ? null
    : {
        numericAgeMin: row.numeric_age_min,
        numericAgeMax: row.numeric_age_max,
        numericAgeUnit: row.numeric_age_unit,
        numericAgeYearsUnit: row.numeric_age_years_unit,
        geologicalAgeMin: row.geological_age_min,
        geologicalAgeMax: row.geological_age_max,
        geologicalUnit: row.geological_unit,
      };
  return sampleSchema.parse({
    id: row.id,
    name: row.name,
    nature: row.nature,
    type: row.type,
    material: row.material,
    texture: row.texture,
    metamorphicFacies: row.metamorphic_facies,
    collectionMethod: row.collection_method,
    collectionMethodDescription: row.collection_method_description,
    specificName: row.specific_name,
    location: toLocation(row),
    description: toDescription(row),
    condition: toCondition(row),
    scientificContext: toScientificContext(row),
    age,
    links: links.map((link) => ({
      id: link.id,
      url: link.url,
      description: link.description,
    })),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mediaType: attachment.media_type,
      description: attachment.description,
    })),
    security: toSecurity(row),
    existenceStatus: row.existence_status,
    availabilityStatus: row.availability_status,
    publicationYear: row.publication_year,
    resourceType: row.resource_type,
    economicInterestElements: row.economic_interest_elements ?? [],
    economicResourceTypePrecision: row.economic_resource_type_precision,
    economicDepositName: row.economic_deposit_name,
    economicDepositDescription: row.economic_deposit_description,
    igsn: row.igsn,
    manualGroups,
    institutionalOrganization: row.institutional_organization,
    institutionalOsu: row.institutional_osu,
    institutionalLaboratory: row.institutional_laboratory,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
