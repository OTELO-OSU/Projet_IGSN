import { Kysely, type ColumnType, type Generated } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import { z } from "zod";

type SampleTable = {
  // UUIDv7 generated in the app, so it is a required value on insert.
  id: string;
  name: string;
  nature: string;
  // Taxonomy path (e.g. "core.section"); null until classified. Stored as
  // ltree, which the driver reads and writes as text.
  type: string | null;
  // Hierarchical classification path stored as ltree; Kysely has no ltree type,
  // so it is a plain string. Null until the sample is classified.
  material: string | null;
  // Igneous texture (flat controlled vocabulary); null unless the material is a
  // plutonic/volcanic path. Not part of the material tree, so plain text.
  texture: string | null;
  // Metamorphic facies (flat controlled vocabulary); null unless the material is
  // metamorphic. Not part of the material tree, so plain text.
  metamorphic_facies: string | null;
  // Collection-method taxonomy path (e.g. "coring.gravity_corer"); null until
  // recorded. Stored as ltree, read/written as text.
  collection_method: string | null;
  // Free-text detail on the collection method; null when not provided.
  collection_method_description: string | null;
  // Precise designation; null on a draft, required to publish (domain rule).
  specific_name: string | null;
  // Sample description (ADR 0015), all nullable. Collection dates are `date`
  // columns: postgres.js parses them into UTC-midnight Date objects on read,
  // while the app writes them as YYYY-MM-DD strings.
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
  // Age sub-datum: flat nullable columns (an empty age is all-null). A non-range
  // value stores the same number/code in both bounds (min == max). Numeric bounds
  // are double precision (read as numbers); unit and codes are text. Shared unit
  // and years unit apply to the whole numeric age; geological_unit is free text.
  numeric_age_min: number | null;
  numeric_age_max: number | null;
  numeric_age_unit: string | null;
  numeric_age_years_unit: string | null;
  geological_age_min: string | null;
  geological_age_max: string | null;
  geological_unit: string | null;
  // Location (ADR 0014). `location_type` (point/area), not `type`: that is the
  // taxonomy path above. Raw coordinate columns round-trip as JS numbers;
  // `geom` is a DB-generated geography (never inserted), referenced only in
  // spatial predicates.
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
  // Sample condition (stored like the description, ADR 0016), all nullable.
  // The storage conditions multi-select is a text array; null when not
  // filled, never empty.
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
  // Safety hazards (like the condition, ADR 0016), all nullable. Each hazard is
  // a boolean flag with an optional free-text explanation.
  radioactivity: boolean | null;
  radioactivity_explanation: string | null;
  asbestos_rich: boolean | null;
  asbestos_explanation: string | null;
  chemical_risk: boolean | null;
  chemical_risk_explanation: string | null;
  // Scientific context (provenance), all nullable text. `sc_provenance_status`
  // is the discriminant; each branch's fields are separate columns, shared
  // `sc_collector_name` serves both. ROR ids and vocabulary codes are text.
  sc_provenance_status: string | null;
  sc_funder_organization: string | null;
  sc_research_program_name: string | null;
  sc_research_program_chief: string | null;
  sc_research_program_chief_orcid: string | null;
  sc_research_structure: string | null;
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
  // Whether the physical sample still exists; null on a draft, required to publish.
  availability: string | null;
  // Year of first publication; null until published, set once at publish.
  publication_year: number | null;
  // Economic interest as a dot-path rooted at the yes/no/unknown answer (resource
  // type / deposit / uranium sub-type follow under `yes`); an ltree read and
  // written as text like material and collection_method; null until set.
  economic_interest: string | null;
  // Chemical-element codes (text[]); null when unset, never empty.
  economic_interest_elements: string[] | null;
  // Free-text economic detail; null when not provided.
  economic_resource_type_precision: string | null;
  economic_deposit_name: string | null;
  economic_deposit_description: string | null;
  // Null until the sample is published; then derived from the id with generateIgsnSuffix.
  igsn: string | null;
  published: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
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

export type DB = {
  sample: SampleTable;
  sample_link: SampleLinkTable;
  sample_attachment: SampleAttachmentTable;
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
