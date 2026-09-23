import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { DateRange } from "@projet-igsn/domain/sample/date-range";
import type { Selectable } from "kysely";

import { compareProcessSteps } from "@projet-igsn/domain/sample/process-step/compare-process-steps";
import { type Sample, sampleSchema } from "@projet-igsn/domain/sample/sample";
import { scientificContextSchema } from "@projet-igsn/domain/sample/scientific-context/model";

import type { DB } from "../../db.ts";

import { type LocationRow, toLocation } from "./to-location.ts";

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

function toDateRange(
  sampleId: string,
  field: string,
  columns: {
    start: string | null;
    end: string | null;
    precision: string | null;
    timeZone: string | null;
  },
): DateRange | null {
  const { start, end, timeZone } = columns;
  if (start === null || end === null) return null;
  if (columns.precision !== "hour") return { precision: "day", start, end };
  if (timeZone === null) {
    throw new Error(
      `sample ${sampleId} has an hour-precision ${field} without a time zone`,
    );
  }
  return { precision: "hour", start, end, timeZone };
}

export function toCollectionDate(
  row: Pick<
    Selectable<DB["sample"]>,
    | "id"
    | "collection_date_start"
    | "collection_date_end"
    | "collection_date_precision"
    | "collection_date_time_zone"
  >,
): DateRange | null {
  return toDateRange(row.id, "collection date", {
    start: row.collection_date_start,
    end: row.collection_date_end,
    precision: row.collection_date_precision,
    timeZone: row.collection_date_time_zone,
  });
}

function toDescription(row: Selectable<DB["sample"]>) {
  return prune({
    collectionDate: toCollectionDate(row),
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

function resolveContact(
  account: ContactAccount | null | undefined,
  columns: { firstname: string | null; lastname: string | null },
) {
  return {
    firstname: columns.firstname ?? account?.firstname ?? null,
    lastname: columns.lastname ?? account?.name ?? null,
    orcid: account?.orcid ?? null,
  };
}

function toScientificContext(row: SampleRow) {
  const collector = resolveContact(row.collectorAccount, {
    firstname: row.sc_collector_firstname,
    lastname: row.sc_collector_lastname,
  });
  if (row.sc_provenance_status === "field_sample") {
    const chiefScientist = resolveContact(row.chiefScientistAccount, {
      firstname: row.sc_chief_scientist_firstname,
      lastname: row.sc_chief_scientist_lastname,
    });
    return scientificContextSchema.parse({
      provenanceStatus: "field_sample",
      additionalRoles: (row.additionalRoles ?? []).map((additional) => {
        const person = resolveContact(additional.account, {
          firstname: additional.person_firstname,
          lastname: additional.person_lastname,
        });
        return {
          role: additional.role,
          personUserId: additional.person_user_id,
          personFirstname: person.firstname,
          personLastname: person.lastname,
          personOrcid: person.orcid,
        };
      }),
      ...omitNull({
        funderOrganizations: row.sc_funder_organizations,
        researchProgramName: row.sc_research_program_name,
        chiefScientistUserId: row.sc_chief_scientist_user_id,
        chiefScientistFirstname: chiefScientist.firstname,
        chiefScientistLastname: chiefScientist.lastname,
        chiefScientistOrcid: chiefScientist.orcid,
        hostInstitution: row.sc_host_institution,
        collectorUserId: row.sc_collector_user_id,
        collectorFirstname: collector.firstname,
        collectorLastname: collector.lastname,
        collectorOrcid: collector.orcid,
        funding: row.sc_funding,
        researchProgramDescription: row.sc_research_program_description,
        platformType: row.sc_platform_type,
        launchPlatformName: row.sc_launch_platform_name,
      }),
    });
  }
  if (row.sc_provenance_status === "collection_specimen") {
    const curator = resolveContact(row.collectionCuratorAccount, {
      firstname: row.sc_collection_curator_firstname,
      lastname: row.sc_collection_curator_lastname,
    });
    return scientificContextSchema.parse({
      provenanceStatus: "collection_specimen",
      ...omitNull({
        collectionCuratorUserId: row.sc_collection_curator_user_id,
        collectionCuratorFirstname: curator.firstname,
        collectionCuratorLastname: curator.lastname,
        collectionOrigin: row.sc_collection_origin,
        collectorUserId: row.sc_collector_user_id,
        collectorFirstname: collector.firstname,
        collectorLastname: collector.lastname,
        collectionContextDescription: row.sc_collection_context_description,
      }),
    });
  }
  return null;
}

function toRepository(row: Selectable<DB["sample"]>) {
  return prune({
    currentArchive: row.rep_current_archive,
    currentArchiveContactFirstname: row.rep_current_archive_contact_firstname,
    currentArchiveContactLastname: row.rep_current_archive_contact_lastname,
    collectionName: row.rep_collection_name,
    originalArchive: row.rep_original_archive,
    originalArchiveContactFirstname: row.rep_original_archive_contact_firstname,
    originalArchiveContactLastname: row.rep_original_archive_contact_lastname,
  });
}

function toSyntheticDetails(row: SampleRow) {
  const operator = resolveContact(row.operatorAccount, {
    firstname: row.syn_operator_firstname,
    lastname: row.syn_operator_lastname,
  });
  return prune({
    startingMaterial: row.syn_starting_material,
    startingMaterialNature: row.syn_starting_material_nature,
    startingMaterialComposition: row.syn_starting_material_composition,
    finalProduct: row.syn_final_product,
    experimentType: row.syn_experiment_type,
    experimentDuration: measurement(
      row.syn_experiment_duration_value,
      row.syn_experiment_duration_unit,
    ),
    synthesisDate: toDateRange(row.id, "synthesis date", {
      start: row.syn_synthesis_date_start,
      end: row.syn_synthesis_date_end,
      precision: row.syn_synthesis_date_precision,
      timeZone: row.syn_synthesis_date_time_zone,
    }),
    operatorUserId: row.syn_operator_user_id,
    operatorFirstname: operator.firstname,
    operatorLastname: operator.lastname,
    operatorOrcid: operator.orcid,
    researchStructure: row.syn_research_structure,
    temperature: measurement(
      row.syn_temperature_value,
      row.syn_temperature_unit,
    ),
    pressure: measurement(row.syn_pressure_value, row.syn_pressure_unit),
    experimentalProtocol: row.syn_experimental_protocol,
    experimentPurpose: row.syn_experiment_purpose,
    equipmentUsed: row.syn_equipment_used,
  });
}

type ContactAccount = {
  firstname: string | null;
  name: string | null;
  orcid: string | null;
};

type SampleRow = Selectable<DB["sample"]> & {
  chiefScientistAccount?: ContactAccount | null;
  collectorAccount?: ContactAccount | null;
  collectionCuratorAccount?: ContactAccount | null;
  operatorAccount?: ContactAccount | null;
  location?: LocationRow | null;
  relations?: Selectable<DB["sample_relation"]>[];
  processSteps?: Selectable<DB["sample_process_step"]>[];
  additionalRoles?: (Selectable<DB["sample_additional_role"]> & {
    account?: ContactAccount | null;
  })[];
  attachments?: Selectable<DB["sample_attachment"]>[];
  manualGroups?: ManualGroup[];
  owner?: Pick<Selectable<DB["user"]>, "name" | "firstname"> | null;
  parents?: Pick<
    Selectable<DB["sample"]>,
    "id" | "igsn" | "name" | "material"
  >[];
};

export function toSample(row: SampleRow): Sample {
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
  const sample = sampleSchema.parse({
    id: row.id,
    name: row.name,
    localId: row.local_id,
    localIdDescription: row.local_id_description,
    nature: row.nature,
    type: row.type,
    material: row.material,
    materialOtherName: row.material_other_name,
    texture: row.texture,
    metamorphicFacies: row.metamorphic_facies,
    metamorphicFabric: row.metamorphic_fabric,
    collectionMethod: row.collection_method,
    collectionMethodDescription: row.collection_method_description,
    geologicalContextDescription: row.geological_context_description,
    physiographicEnvironment: row.physiographic_environment,
    specificName: row.specific_name,
    location: toLocation(row.location ?? null),
    description: toDescription(row),
    condition: toCondition(row),
    scientificContext: toScientificContext(row),
    repository: toRepository(row),
    syntheticDetails: toSyntheticDetails(row),
    age,
    relations: (row.relations ?? []).map((relation) => ({
      id: relation.id,
      relationType: relation.relation_type,
      identifierType: relation.identifier_type,
      identifier: relation.identifier,
      targetTitle: relation.target_title,
      targetResourceType: relation.target_resource_type,
      relatedMetadataScheme: relation.related_metadata_scheme,
      schemeURI: relation.scheme_uri,
      schemeType: relation.scheme_type,
      description: relation.description,
    })),
    processSteps: (row.processSteps ?? []).map((step) => ({
      kind: step.kind,
      date: toDateRange(row.id, "process step date", {
        start: step.date_start,
        end: step.date_end,
        precision: step.date_precision,
        timeZone: step.date_time_zone,
      }),
      description: step.description,
    })),
    attachments: (row.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mediaType: attachment.media_type,
      title: attachment.title,
      targetResourceType: attachment.target_resource_type,
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
    doiPrefix: row.doi_prefix,
    manualGroups: row.manualGroups ?? [],
    owner: row.owner
      ? { name: row.owner.name, firstname: row.owner.firstname }
      : null,
    parents: row.parents ?? [],
    institutionalOrganization: row.institutional_organization,
    institutionalOsu: row.institutional_osu,
    institutionalLaboratory: row.institutional_laboratory,
    status: row.status,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  });
  sample.processSteps.sort(compareProcessSteps);
  return sample;
}
