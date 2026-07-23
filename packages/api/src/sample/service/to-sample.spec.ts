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
  collection_method: "coring.gravity_corer",
  collection_method_description: "Giant corer, 20 m barrel",
  specific_name: "FTB-2026-042",
  collection_date_start: null,
  collection_date_end: null,
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
  elevation_min: null,
  elevation_max: null,
  elevation_unit: null,
  vertical_datum: null,
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
  sc_funder_organization: null,
  sc_research_program_name: null,
  sc_research_program_chief: null,
  sc_research_program_chief_orcid: null,
  sc_research_structure: null,
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
  availability: "exists",
  publication_year: null,
  economic_interest: null,
  economic_interest_elements: null,
  economic_resource_type_precision: null,
  economic_deposit_name: null,
  economic_deposit_description: null,
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  published: false,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-06-01T00:00:00.000Z"),
};

const ageRow = {
  ...row,
  numeric_age_min: 12000,
  numeric_age_max: 12000,
  numeric_age_unit: "a",
  numeric_age_years_unit: "bp",
  geological_age_min: "ics8",
  geological_age_max: "ics12",
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
      collectionMethod: "coring.gravity_corer",
      collectionMethodDescription: "Giant corer, 20 m barrel",
      specificName: "FTB-2026-042",
      location: null,
      description: null,
      condition: null,
      scientificContext: null,
      age: null,
      links: [],
      attachments: [],
      security: null,
      availability: "exists",
      publicationYear: null,
      economicInterest: null,
      economicInterestElements: [],
      economicResourceTypePrecision: null,
      economicDepositName: null,
      economicDepositDescription: null,
      igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
      published: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
  });

  it("should map link and attachment child rows", () => {
    // Act
    const sample = toSample(
      row,
      [
        {
          id: "018f4d3a-1f2b-7c00-8000-000000000001",
          sample_id: row.id,
          url: "https://doi.org/10.1594/IEDA.100252",
          description: null,
        },
      ],
      [
        {
          id: "018f4d3a-1f2b-7c00-8000-000000000002",
          sample_id: row.id,
          name: "analysis.pdf",
          media_type: "application/pdf",
          description: "XRF analysis report",
        },
      ],
    );
    // Assert
    expect(sample.links).toEqual([
      {
        id: "018f4d3a-1f2b-7c00-8000-000000000001",
        url: "https://doi.org/10.1594/IEDA.100252",
        description: null,
      },
    ]);
    expect(sample.attachments).toEqual([
      {
        id: "018f4d3a-1f2b-7c00-8000-000000000002",
        name: "analysis.pdf",
        mediaType: "application/pdf",
        description: "XRF analysis report",
      },
    ]);
  });

  it("should throw when a link url is not a DOI url", () => {
    expect(() =>
      toSample(row, [
        {
          id: "018f4d3a-1f2b-7c00-8000-000000000001",
          sample_id: row.id,
          url: "https://example.com/paper",
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
      geologicalAgeMin: "ics8",
      geologicalAgeMax: "ics12",
      geologicalUnit: "Green Sandstone Fm",
    });
  });

  it("should throw when the age carries an unknown geological code", () => {
    expect(() =>
      toSample({ ...ageRow, geological_age_min: "ics99" }),
    ).toThrow();
  });

  it("should throw when the nature is not a known value", () => {
    expect(() => toSample({ ...row, nature: "inconnu" })).toThrow();
  });

  it("should throw when the type is not a known taxonomy path", () => {
    expect(() => toSample({ ...row, type: "half_round" })).toThrow();
  });

  it("should throw when the collection method is not a known taxonomy path", () => {
    expect(() =>
      toSample({ ...row, collection_method: "gravity_corer" }),
    ).toThrow();
  });

  it("should throw when the name is empty", () => {
    expect(() => toSample({ ...row, name: "" })).toThrow();
  });

  it("should throw when the id is not a uuid", () => {
    expect(() => toSample({ ...row, id: "pas-un-uuid" })).toThrow();
  });
});
