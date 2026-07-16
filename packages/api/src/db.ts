import { Kysely, type Generated } from "kysely";
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
  // Null until the sample is published; then derived from the id with generateIgsnSuffix.
  igsn: string | null;
  published: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

// A sample's location (ADR 0014), 1:1 with sample via sample_id. Raw coordinate
// columns round-trip as JS numbers; `geom` is a DB-generated geography (never
// inserted, never selected into the app), referenced only in spatial predicates.
type LocationTable = {
  sample_id: string;
  type: string | null;
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
  geom: Generated<string>;
};

// 0:1 with sample (sample_id is PK + cascading FK). Every field nullable: an
// empty age is simply no row. Numeric columns are double precision, so the
// driver reads them as numbers; codes and units are text.
type SampleAgeTable = {
  sample_id: string;
  numeric_age: number | null;
  numeric_age_unit: string | null;
  numeric_age_years_unit: string | null;
  numeric_age_min: number | null;
  numeric_age_min_unit: string | null;
  numeric_age_min_years_unit: string | null;
  numeric_age_max: number | null;
  numeric_age_max_unit: string | null;
  numeric_age_max_years_unit: string | null;
  geological_age: string | null;
  geological_age_min: string | null;
  geological_age_max: string | null;
  geological_unit: string | null;
};

export type DB = {
  sample: SampleTable;
  location: LocationTable;
  sample_age: SampleAgeTable;
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
