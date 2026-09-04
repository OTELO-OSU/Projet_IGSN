import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { UserStatus } from "@projet-igsn/domain/user/model";

import { Kysely, type ColumnType, type Generated } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import { z } from "zod";

type SampleTable = {
  id: string;
  name: string;
  nature: string;
  type: string | null;
  material: string | null;
  texture: string | null;
  metamorphic_facies: string | null;
  metamorphic_fabric: string | null;
  collection_method: string | null;
  collection_method_description: string | null;
  geological_context_description: string | null;
  geomorphological_environment: string | null;
  specific_name: string | null;
  collection_date_start: string | null;
  collection_date_end: string | null;
  collection_date_precision: string | null;
  collection_date_time_zone: string | null;
  oriented: boolean | null;
  orientation_explanation: string | null;
  open_description: string | null;
  length_value: number | null;
  length_unit: string | null;
  width_value: number | null;
  width_unit: string | null;
  thickness_value: number | null;
  thickness_unit: string | null;
  mass_value: number | null;
  mass_unit: string | null;
  volume_value: number | null;
  volume_unit: string | null;
  numeric_age_min: number | null;
  numeric_age_max: number | null;
  numeric_age_unit: string | null;
  numeric_age_years_unit: string | null;
  annum_min: Generated<number | null>;
  annum_max: Generated<number | null>;
  geological_age_min: number | null;
  geological_age_max: number | null;
  geological_unit: string | null;
  location_type: string | null;
  point_longitude: number | null;
  point_latitude: number | null;
  area_west_longitude: number | null;
  area_east_longitude: number | null;
  area_south_latitude: number | null;
  area_north_latitude: number | null;
  line_start_longitude: number | null;
  line_start_latitude: number | null;
  line_end_longitude: number | null;
  line_end_latitude: number | null;
  vertical_position: number | null;
  vertical_position_min: number | null;
  vertical_position_max: number | null;
  line_start_vertical_position: number | null;
  line_end_vertical_position: number | null;
  vertical_reference: string | null;
  vertical_reference_system: string | null;
  navigation_type: string | null;
  region_kind: string | null;
  country: string | null;
  ocean_sea: string | null;
  locality_name: string | null;
  locality_description: string | null;
  geom: Generated<string | null>;
  packaging: string | null;
  storage_conditions: string[] | null;
  temperature_type: string | null;
  temperature_value: number | null;
  temperature_unit: string | null;
  humidity_type: string | null;
  humidity_percentage: number | null;
  light: string | null;
  pressure_type: string | null;
  pressure_value: number | null;
  pressure_unit: string | null;
  specific_conditions: string | null;
  radioactivity: boolean | null;
  radioactivity_explanation: string | null;
  asbestos_rich: boolean | null;
  asbestos_explanation: string | null;
  chemical_risk: boolean | null;
  chemical_risk_explanation: string | null;
  sc_provenance_status: string | null;
  sc_funder_organizations: string[] | null;
  sc_research_program_name: string | null;
  sc_chief_scientist: string | null;
  sc_chief_scientist_orcid: string | null;
  sc_host_institution: string[] | null;
  sc_collector_name: string | null;
  sc_collector_orcid: string | null;
  sc_research_campaign: string | null;
  sc_funding: string | null;
  sc_research_program_description: string | null;
  sc_field_name: string | null;
  sc_mission_description: string | null;
  sc_collection_curator: string | null;
  sc_collection_origin: string | null;
  sc_collection_context_description: string | null;
  rep_current_archive: string | null;
  rep_current_archive_contact: string | null;
  rep_collection_name: string | null;
  rep_original_archive: string | null;
  rep_original_archive_contact: string | null;
  syn_starting_material: string | null;
  syn_starting_material_nature: string | null;
  syn_starting_material_composition: string | null;
  syn_final_product: string | null;
  syn_experiment_type: string | null;
  syn_experiment_duration_value: number | null;
  syn_experiment_duration_unit: string | null;
  syn_experiment_duration_not_relevant: boolean | null;
  syn_synthesis_date_start: ColumnType<Date, string, string> | null;
  syn_synthesis_date_end: ColumnType<Date, string, string> | null;
  syn_operator_name: string | null;
  syn_operator_orcid: string | null;
  syn_research_structure: string[] | null;
  syn_temperature_value: number | null;
  syn_temperature_unit: string | null;
  syn_pressure_value: number | null;
  syn_pressure_unit: string | null;
  syn_experimental_protocol: string | null;
  syn_experiment_purpose: string | null;
  syn_equipment_used: string | null;
  existence_status: string | null;
  availability_status: string | null;
  publication_year: number | null;
  resource_type: string | null;
  economic_interest_elements: string[] | null;
  economic_resource_type_precision: string | null;
  economic_deposit_name: string | null;
  economic_deposit_description: string | null;
  igsn: string | null;
  // ponytail: snapshot of the owner's groups at creation, kept even though the mock data derives the upper two from the labo, since real co-tutelle data will not be a clean tree
  institutional_organization: string | null;
  institutional_osu: string | null;
  institutional_laboratory: string | null;
  status: Generated<SampleStatus>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

type SampleEditLockTable = {
  sample_id: string;
  user_id: string;
  expires_at: Date;
};

type SampleRelationTable = {
  id: string;
  sample_id: string;
  relation_type: string;
  identifier_type: string;
  identifier: string;
  target_title: string;
  target_resource_type: string | null;
  relation_type_information: string | null;
  related_metadata_scheme: string | null;
  scheme_uri: string | null;
  scheme_type: string | null;
  description: string | null;
};

type SampleAttachmentTable = {
  id: string;
  sample_id: string;
  name: string;
  media_type: string;
  title: string | null;
  target_resource_type: string | null;
  description: string | null;
};

type UserTable = {
  id: string;
  email: string;
  name: string | null;
  firstname: string | null;
  orcid: string | null;
  institutional_organization: string | null;
  institutional_osu: string | null;
  institutional_laboratory: string | null;
  status: Generated<UserStatus>;
  super_admin: Generated<boolean>;
  created_at: Generated<Date>;
};

type UserSampleTable = {
  user_id: string;
  sample_id: string;
  role: "owner" | "editor" | "contributor";
};

type ManualGroupTable = {
  id: string;
  name: string;
  created_at: Generated<Date>;
};

type ManualGroupMemberTable = {
  group_id: string;
  user_id: string;
};

type SampleManualGroupTable = {
  sample_id: string;
  group_id: string;
};

type UserManagedInstitutionalGroupTable = {
  user_id: string;
  kind: "organization" | "osu" | "laboratory";
  code: string;
};

type UserManagedManualGroupTable = {
  user_id: string;
  group_id: string;
};

export type DB = {
  manual_group: ManualGroupTable;
  manual_group_member: ManualGroupMemberTable;
  sample: SampleTable;
  sample_manual_group: SampleManualGroupTable;
  sample_relation: SampleRelationTable;
  sample_attachment: SampleAttachmentTable;
  sample_edit_lock: SampleEditLockTable;
  user: UserTable;
  user_managed_institutional_group: UserManagedInstitutionalGroupTable;
  user_managed_manual_group: UserManagedManualGroupTable;
  user_sample: UserSampleTable;
};

const dbConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.literal("require").optional(),
});

export function createDb(): Kysely<DB> {
  const config = dbConfigSchema.parse({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || undefined,
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL,
  });
  return new Kysely<DB>({
    dialect: new PostgresJSDialect({ postgres: postgres(config) }),
  });
}
