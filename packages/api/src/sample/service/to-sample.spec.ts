import { describe, expect, it } from "vitest";

import { toSample } from "./to-sample.ts";

const row = {
  id: "018f4d3a-1f2b-7c00-8000-000000000000",
  name: "Grès de Fontainebleau",
  nature: "rock_powder",
  type: "dredge",
  material: "rock.igneous.plutonic.felsic.granite",
  texture: "phaneritic",
  metamorphic_facies: null,
  metamorphic_fabric: null,
  collection_method: "coring.gravity_corer",
  collection_method_description: "Giant corer, 20 m barrel",
  geological_context_description: "Quartz sandstone over a marine platform",
  geomorphological_environment: "marine_zone.continental_shelf",
  specific_name: "FTB-2026-042",
  collection_date_start: null,
  collection_date_end: null,
  collection_date_precision: null,
  collection_date_time_zone: null,
  oriented: null,
  orientation_explanation: null,
  open_description: null,
  length_value: null,
  length_unit: null,
  width_value: null,
  width_unit: null,
  thickness_value: null,
  thickness_unit: null,
  mass_value: null,
  mass_unit: null,
  volume_value: null,
  volume_unit: null,
  location_type: null,
  point_longitude: null,
  point_latitude: null,
  area_west_longitude: null,
  area_east_longitude: null,
  area_south_latitude: null,
  area_north_latitude: null,
  line_start_longitude: null,
  line_start_latitude: null,
  line_end_longitude: null,
  line_end_latitude: null,
  vertical_position: null,
  vertical_position_min: null,
  vertical_position_max: null,
  line_start_vertical_position: null,
  line_end_vertical_position: null,
  vertical_reference: null,
  vertical_reference_system: null,
  navigation_type: null,
  region_kind: null,
  country: null,
  ocean_sea: null,
  locality_name: null,
  locality_description: null,
  geom: null,
  packaging: null,
  storage_conditions: null,
  temperature_type: null,
  temperature_value: null,
  temperature_unit: null,
  humidity_type: null,
  humidity_percentage: null,
  light: null,
  pressure_type: null,
  pressure_value: null,
  pressure_unit: null,
  specific_conditions: null,
  numeric_age_min: null,
  numeric_age_max: null,
  numeric_age_unit: null,
  numeric_age_years_unit: null,
  annum_min: null,
  annum_max: null,
  geological_age_min: null,
  geological_age_max: null,
  geological_unit: null,
  radioactivity: null,
  radioactivity_explanation: null,
  asbestos_rich: null,
  asbestos_explanation: null,
  chemical_risk: null,
  chemical_risk_explanation: null,
  sc_provenance_status: null,
  sc_funder_organizations: null,
  sc_research_program_name: null,
  sc_chief_scientist: null,
  sc_chief_scientist_orcid: null,
  sc_host_institution: null,
  sc_collector_name: null,
  sc_collector_orcid: null,
  sc_research_campaign: null,
  sc_funding: null,
  sc_research_program_description: null,
  sc_field_name: null,
  sc_mission_description: null,
  sc_collection_curator: null,
  sc_collection_origin: null,
  sc_collection_context_description: null,
  rep_current_archive: null,
  rep_current_archive_contact: null,
  rep_collection_name: null,
  rep_original_archive: null,
  rep_original_archive_contact: null,
  syn_starting_material: null,
  syn_starting_material_nature: null,
  syn_starting_material_composition: null,
  syn_final_product: null,
  syn_experiment_type: null,
  syn_experiment_duration_value: null,
  syn_experiment_duration_unit: null,
  syn_experiment_duration_not_relevant: null,
  syn_synthesis_date_start: null,
  syn_synthesis_date_end: null,
  syn_operator_name: null,
  syn_operator_orcid: null,
  syn_research_structure: null,
  syn_temperature_value: null,
  syn_temperature_unit: null,
  syn_pressure_value: null,
  syn_pressure_unit: null,
  syn_experimental_protocol: null,
  syn_experiment_purpose: null,
  syn_equipment_used: null,
  existence_status: "exists",
  availability_status: "available",
  publication_year: null,
  resource_type: null,
  economic_interest_elements: null,
  economic_resource_type_precision: null,
  economic_deposit_name: null,
  economic_deposit_description: null,
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  institutional_organization: null,
  institutional_osu: null,
  institutional_laboratory: null,
  status: "draft" as const,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-06-01T00:00:00.000Z"),
};

const ageRow = {
  ...row,
  numeric_age_min: 12000,
  numeric_age_max: 12000,
  numeric_age_unit: "a",
  numeric_age_years_unit: "bp",
  geological_age_min: 8,
  geological_age_max: 12,
  geological_unit: "Green Sandstone Fm",
};

describe("toSample", () => {
  it("should map a db row to a domain Sample with camelCase fields", () => {
    // Act
    const sample = toSample(row);
    // Assert
    expect(sample).toEqual({
      id: "018f4d3a-1f2b-7c00-8000-000000000000",
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: "dredge",
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
      metamorphicFacies: null,
      metamorphicFabric: null,
      collectionMethod: "coring.gravity_corer",
      collectionMethodDescription: "Giant corer, 20 m barrel",
      geologicalContextDescription: "Quartz sandstone over a marine platform",
      geomorphologicalEnvironment: "marine_zone.continental_shelf",
      specificName: "FTB-2026-042",
      location: null,
      description: null,
      condition: null,
      scientificContext: null,
      repository: null,
      syntheticDetails: null,
      age: null,
      relations: [],
      attachments: [],
      security: null,
      existenceStatus: "exists",
      availabilityStatus: "available",
      owner: null,
      publicationYear: null,
      resourceType: null,
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: null,
      economicDepositDescription: null,
      igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
      manualGroups: [],
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: null,
      status: "draft",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
  });

  it("should map relation and attachment child rows", () => {
    // Act
    const sample = toSample(
      row,
      [
        {
          id: "018f4d3a-1f2b-7c00-8000-000000000001",
          sample_id: row.id,
          relation_type: "has_metadata",
          identifier_type: "doi",
          identifier: "https://doi.org/10.1594/IEDA.100252",
          target_title: "IEDA companion dataset",
          target_resource_type: "dataset",
          relation_type_information: null,
          related_metadata_scheme: "DataCite",
          scheme_uri: "https://schema.datacite.org/meta/kernel-4.6/",
          scheme_type: "XSD",
          description: null,
        },
      ],
      [
        {
          id: "018f4d3a-1f2b-7c00-8000-000000000002",
          sample_id: row.id,
          name: "analysis.pdf",
          media_type: "application/pdf",
          title: "XRF analysis",
          target_resource_type: "report",
          description: "XRF analysis report",
        },
      ],
    );
    // Assert
    expect(sample.relations).toEqual([
      {
        id: "018f4d3a-1f2b-7c00-8000-000000000001",
        relationType: "has_metadata",
        identifierType: "doi",
        identifier: "https://doi.org/10.1594/IEDA.100252",
        targetTitle: "IEDA companion dataset",
        targetResourceType: "dataset",
        relationTypeInformation: null,
        relatedMetadataScheme: "DataCite",
        schemeURI: "https://schema.datacite.org/meta/kernel-4.6/",
        schemeType: "XSD",
        description: null,
      },
    ]);
    expect(sample.attachments).toEqual([
      {
        id: "018f4d3a-1f2b-7c00-8000-000000000002",
        name: "analysis.pdf",
        mediaType: "application/pdf",
        title: "XRF analysis",
        targetResourceType: "report",
        description: "XRF analysis report",
      },
    ]);
  });

  it("should throw when a doi relation target is not a DOI url", () => {
    expect(() =>
      toSample(row, [
        {
          id: "018f4d3a-1f2b-7c00-8000-000000000001",
          sample_id: row.id,
          relation_type: "other",
          identifier_type: "doi",
          identifier: "https://example.com/paper",
          target_title: "A related paper",
          target_resource_type: null,
          relation_type_information: null,
          related_metadata_scheme: null,
          scheme_uri: null,
          scheme_type: null,
          description: null,
        },
      ]),
    ).toThrow();
  });

  it("should map location columns to a nested location", () => {
    const sample = toSample({
      ...row,
      location_type: "point",
      point_longitude: 2.35,
      point_latitude: 48.85,
    });
    expect(sample.location).toEqual({
      position: { type: "point", longitude: 2.35, latitude: 48.85 },
    });
  });

  it("should map the age columns to the sample's age", () => {
    // Act
    const sample = toSample(ageRow);
    // Assert
    expect(sample.age).toEqual({
      numericAgeMin: 12000,
      numericAgeMax: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
      geologicalAgeMin: 8,
      geologicalAgeMax: 12,
      geologicalUnit: "Green Sandstone Fm",
    });
  });

  it("should throw when the age carries an out-of-scale geological rank", () => {
    expect(() => toSample({ ...ageRow, geological_age_min: 99 })).toThrow();
  });

  it("should throw on a row the sample schema rejects", () => {
    expect(() => toSample({ ...row, nature: "inconnu" })).toThrow();
  });
});
