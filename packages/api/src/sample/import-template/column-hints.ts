import catalog from "@projet-igsn/domain/messages/en.json" with { type: "json" };

import { SAMPLE_COLUMNS } from "./columns.ts";

const positionNotes = (suffix: string, note: string) =>
  Object.fromEntries(
    SAMPLE_COLUMNS.flatMap(({ path }) =>
      path?.startsWith("location.position.") &&
      path.toLowerCase().endsWith(suffix)
        ? [[path, note]]
        : [],
    ),
  );

export const COLUMN_HINTS: Readonly<Record<string, string>> = {
  name: catalog.name_placeholder,
  localId: catalog.local_id_placeholder,
  "scientificContext.researchProgramName":
    catalog.research_program_name_placeholder,
  "scientificContext.funding": catalog.funding_placeholder,
  "scientificContext.launchPlatformName":
    catalog.launch_platform_name_placeholder,
  "repository.collectionName": catalog.collection_name_placeholder,
  "location.localityName": catalog.locality_name_placeholder,
  specificName: catalog.specific_name_placeholder,
  "age.geologicalUnit": catalog.geological_unit_placeholder,
  "location.verticalPositions.start": catalog.field_vertical_position_hint,
  "location.verticalPositions.end": catalog.field_vertical_position_hint,
  "description.collectionDate.timeZone": catalog.time_zone_placeholder,
  "processSteps.date.timeZone": catalog.time_zone_placeholder,
  ...positionNotes("longitude", catalog.field_longitude_hint),
  ...positionNotes("latitude", catalog.field_latitude_hint),
};

export const BLOCK_HINTS: Readonly<Record<string, string>> = {
  nature: catalog.nature_placeholder,
  existence_status: catalog.existence_status_placeholder,
  availability_status: catalog.availability_status_placeholder,
  sample_type: catalog.type_placeholder,
  material: catalog.material_placeholder,
  texture: catalog.texture_placeholder,
  metamorphic_facies: catalog.metamorphic_facies_placeholder,
  metamorphic_fabric: catalog.metamorphic_fabric_placeholder,
  provenance_status: catalog.provenance_status_placeholder,
  platform_type: catalog.platform_type_placeholder,
  collection_origin: catalog.collection_origin_placeholder,
  organization: catalog.organization_placeholder,
  position_type: catalog.location_type_placeholder,
  vertical_reference: catalog.vertical_reference_placeholder,
  vertical_reference_system: catalog.vertical_reference_system_placeholder,
  region: catalog.region_placeholder,
  navigation_type: catalog.navigation_type_placeholder,
  physiographic_environment: catalog.physiographic_environment_placeholder,
  collection_method: catalog.collection_method_placeholder,
  resource_type: catalog.economic_interest_placeholder,
  size_unit: catalog.unit_placeholder,
  mass_unit: catalog.unit_placeholder,
  volume_unit: catalog.unit_placeholder,
  temperature_unit: catalog.unit_placeholder,
  pressure_unit: catalog.unit_placeholder,
  packaging: catalog.packaging_placeholder,
  temperature_type: catalog.temperature_placeholder,
  humidity_type: catalog.humidity_placeholder,
  light: catalog.light_placeholder,
  pressure_type: catalog.pressure_placeholder,
  age_numeric_unit: catalog.age_unit_placeholder,
  age_years_unit: catalog.age_years_placeholder,
  geological_age: catalog.age_geological_placeholder,
  relation_type: catalog.relation_type_placeholder,
  relation_resource_type: catalog.relation_resource_type_placeholder,
  osu: catalog.osu_placeholder,
  laboratory: catalog.laboratory_placeholder,
  manual_group: catalog.manual_group_placeholder,
};
