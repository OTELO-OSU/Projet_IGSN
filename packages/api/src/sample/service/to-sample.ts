import type { Selectable } from "kysely";

import { type Sample, sampleSchema } from "@projet-igsn/domain/sample/sample";
import { scientificContextSchema } from "@projet-igsn/domain/sample/scientific-context/model";

import type { DB } from "../../db.ts";

import { toLocation } from "./to-location.ts";

// `date` columns come back from postgres.js as UTC-midnight Date objects;
// slicing the ISO string recovers the day with no timezone drift (ADR 0015).
function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// A measurement exists only when both halves do; the schema then enforces the
// value/unit coupling on parse.
function measurement(value: number | null, unit: string | null) {
  return value !== null && unit !== null ? { value, unit } : null;
}

// Absent parts are omitted rather than set to null, so a stored value
// round-trips to the same minimal shape the client sent; null when every part
// is absent.
function prune(parts: Record<string, unknown>) {
  const kept = omitNull(parts);
  return Object.keys(kept).length > 0 ? kept : null;
}

// Keeps only the non-null entries; unlike prune it never collapses to null, so
// a discriminated shape can keep a mandatory field (the provenance status)
// alongside its optional siblings.
function omitNull(parts: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(parts).filter(([, part]) => part !== null),
  );
}

// Flat description columns -> nested domain description (ADR 0015); a sample
// without one carries `description: null`.
function toDescription(row: Selectable<DB["sample"]>) {
  return prune({
    collectionDate:
      row.collection_date_start !== null && row.collection_date_end !== null
        ? {
            start: toIsoDate(row.collection_date_start),
            end: toIsoDate(row.collection_date_end),
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

// Flat condition columns -> nested domain condition (same storage pattern as
// the description, ADR 0016). A numeric
// reading nests under its category, so it only exists when the category does.
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

// Flat security columns -> nested domain security (same storage pattern as the
// condition, ADR 0016). A sample without any hazard recorded carries
// `security: null`.
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

// Flat scientific-context columns -> nested domain scientific context (ADR 0014
// storage pattern). `sc_provenance_status` is the discriminant; only its
// branch's columns are read, and `sc_collector_name` is shared by both. A row
// with no status carries `scientificContext: null`.
function toScientificContext(row: Selectable<DB["sample"]>) {
  if (row.sc_provenance_status === "recent_collection") {
    return scientificContextSchema.parse({
      provenanceStatus: "recent_collection",
      ...omitNull({
        funderOrganization: row.sc_funder_organization,
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

// DB row (snake_case) -> domain Sample (camelCase), validated at the boundary.
// Location is flat on the row (see to-location.ts). Age is flat too: all-null
// age columns -> null age. sampleSchema.parse validates the codes at the boundary.
// Links and attachments are child rows (see with-sample-children.ts); the
// schema defaults them to [] when a caller has none to attach.
export function toSample(
  row: Selectable<DB["sample"]>,
  links: Selectable<DB["sample_link"]>[] = [],
  attachments: Selectable<DB["sample_attachment"]>[] = [],
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
    availability: row.availability,
    publicationYear: row.publication_year,
    economicInterest: row.economic_interest,
    economicInterestElements: row.economic_interest_elements ?? [],
    economicResourceTypePrecision: row.economic_resource_type_precision,
    economicDepositName: row.economic_deposit_name,
    economicDepositDescription: row.economic_deposit_description,
    igsn: row.igsn,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
