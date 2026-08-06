import { Kysely, type ColumnType, type Generated } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import { z } from "zod";

type SampleTable = {
  // UUIDv7 generated in the app, so it is a required value on insert.
  id: string;
  name: string;
  nature: string;
  // Taxonomy path (e.g. "core.section"). Stored as ltree, which the driver
  // reads and writes as text.
  type: string | null;
  material: string | null;
  // Igneous texture (flat controlled vocabulary); null unless the material is a
  // plutonic/volcanic path. Not part of the material tree, so plain text.
  texture: string | null;
  // Metamorphic facies (flat controlled vocabulary); null unless the material is
  // metamorphic. Not part of the material tree, so plain text.
  metamorphic_facies: string | null;
  collection_method: string | null;
  collection_method_description: string | null;
  specific_name: string | null;
  // Sample description (ADR 0015). Collection dates are `date` columns:
  // postgres.js parses them into UTC-midnight Date objects on read, while the
  // app writes them as YYYY-MM-DD strings.
  collection_date_start: ColumnType<Date, string, string> | null;
  collection_date_end: ColumnType<Date, string, string> | null;
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
  // A non-range value stores the same number/code in both bounds (min == max).
  numeric_age_min: number | null;
  numeric_age_max: number | null;
  numeric_age_unit: string | null;
  numeric_age_years_unit: string | null;
  // Generated STORED, never inserted (like `geom`): the comparable age interval
  // in annum, from the numeric age or the geological rank. See the
  // age-annum-columns migration.
  annum_min: Generated<number | null>;
  annum_max: Generated<number | null>;
  // Geological bounds are stored as their rank (1-based integer), not the ics
  // code, so a range filter compares them directly. api maps code <-> rank at
  // the boundary. See the geological-age-as-rank migration.
  geological_age_min: number | null;
  geological_age_max: number | null;
  geological_unit: string | null;
  // Location (ADR 0014). `location_type` (point/area), not `type`: that is the
  // taxonomy path above. `geom` is a DB-generated planar geometry (never
  // inserted), referenced only in spatial predicates.
  location_type: string | null;
  point_longitude: number | null;
  point_latitude: number | null;
  area_west_longitude: number | null;
  area_east_longitude: number | null;
  area_south_latitude: number | null;
  area_north_latitude: number | null;
  elevation_min: number | null;
  elevation_max: number | null;
  elevation_unit: string | null;
  vertical_datum: string | null;
  navigation_type: string | null;
  region_kind: string | null;
  country: string | null;
  ocean_sea: string | null;
  locality_name: string | null;
  locality_description: string | null;
  geom: Generated<string | null>;
  // Sample condition (stored like the description, ADR 0016). The storage
  // conditions multi-select is a text array; null when not filled, never empty.
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
  // `sc_provenance_status` is the discriminant; each branch's fields are
  // separate columns, shared `sc_collector_name` serves both.
  sc_provenance_status: string | null;
  sc_funder_organization: string | null;
  sc_research_program_name: string | null;
  sc_research_program_chief: string | null;
  sc_research_program_chief_orcid: string | null;
  sc_research_structure: string[] | null;
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
  availability: string | null;
  publication_year: number | null;
  // Economic interest as a dot-path rooted at the yes/no/unknown answer
  // (resource type / deposit / uranium sub-type follow under `yes`).
  economic_interest: string | null;
  economic_interest_elements: string[] | null;
  economic_resource_type_precision: string | null;
  economic_deposit_name: string | null;
  economic_deposit_description: string | null;
  // Null until the sample is published; then derived from the id with generateIgsnSuffix.
  igsn: string | null;
  published: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

type SampleEditLockTable = {
  sample_id: string;
  user_id: string;
  expires_at: Date;
};

// Related DOI links, one-to-many with sample (ADR 0017). Ids are app-generated
// UUIDv7, so ordering by id is creation order.
type SampleLinkTable = {
  id: string;
  sample_id: string;
  url: string;
  description: string | null;
};

// Attached-file metadata (ADR 0017); the content lives on disk keyed by id.
type SampleAttachmentTable = {
  id: string;
  sample_id: string;
  name: string;
  media_type: string;
  description: string | null;
};

// A researcher, provisioned from the verified token and keyed by email (ADR
// 0019).
type UserTable = {
  id: string;
  email: string;
  name: string | null;
  firstname: string | null;
  // Self-declared ORCID iD, unique: the lookup key for ORCID logins (ADR 0020).
  orcid: string | null;
  status: Generated<string>;
  super_admin: Generated<boolean>;
  created_at: Generated<Date>;
};

type UserSampleTable = {
  user_id: string;
  sample_id: string;
  role: "owner" | "contributor";
};

export type DB = {
  sample: SampleTable;
  sample_link: SampleLinkTable;
  sample_attachment: SampleAttachmentTable;
  sample_edit_lock: SampleEditLockTable;
  user: UserTable;
  user_sample: UserSampleTable;
};

const dbConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z
    .literal("require")
    .optional()
    .transform((v) => v ?? undefined),
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
