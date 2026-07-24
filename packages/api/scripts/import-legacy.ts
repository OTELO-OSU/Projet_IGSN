import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../src/db.ts";

import { createDb } from "../src/db.ts";
import { conditionColumns } from "../src/sample/service/condition-columns.ts";
import { descriptionColumns } from "../src/sample/service/description-columns.ts";
import { economicInterestColumns } from "../src/sample/service/economic-interest-columns.ts";
import { scientificContextColumns } from "../src/sample/service/scientific-context-columns.ts";
import { securityColumns } from "../src/sample/service/security-columns.ts";
import { toAgeColumns } from "../src/sample/service/to-age-columns.ts";
import { locationColumns } from "../src/sample/service/to-location.ts";
import {
  type LegacyRow,
  isKnownMaterialPath,
  mapCollectionMethod,
  mapCountry,
  mapResourceType,
  toCreateSample,
} from "./import-legacy-mapping.ts";

// The old igsn_resource joined to its lookups and its 1:1 geological child, with
// every label resolved and the scope filtered server-side: public, top-level
// (no parent), and carrying an identifier we can store as the IGSN.
const LEGACY_QUERY = `
  SELECT
    r.name,
    r."resourceIdentifier" AS igsn,
    r."publishDate" AS publish_date,
    r."lastModified" AS last_modified,
    r.latitude, r.longitude,
    r."latitudeEnd" AS latitude_end,
    r."longitudeEnd" AS longitude_end,
    r.elevation,
    r."elevationEnd" AS elevation_end,
    r."elevationUnit" AS elevation_unit,
    r.bathy,
    r."bathyUnit" AS bathy_unit,
    r."collectionStartDate"::text AS collection_start_date,
    r."collectionEndDate"::text AS collection_end_date,
    r.collector,
    r."cruiseFieldPrgm" AS cruise_field_prgm,
    r."fieldName" AS field_name,
    r.purpose,
    r."resourceComment" AS resource_comment,
    r.size,
    r."sizeUnit" AS size_unit,
    r."otherNames" AS other_names,
    r."localityDescription" AS locality_description,
    r.location AS location_text,
    r."locationDescription" AS location_description,
    r."collectionMethodDesc" AS collection_method_desc,
    m.nom AS material,
    c.nom AS classification,
    cm.nom AS collection_method,
    rt.nom AS resource_type,
    co.nom AS country,
    nt.nom AS navigation_type,
    g."ageMin" AS age_min,
    g."ageMax" AS age_max,
    g."ageUnit" AS age_unit,
    g."geologicalUnit" AS geological_unit,
    ga.nom AS geological_age
  FROM igsn_resource r
  LEFT JOIN igsn_material m ON m.id = r.material_id
  LEFT JOIN igsn_classification c ON c.id = r.classification_id
  LEFT JOIN igsn_collectionmethod cm ON cm.id = r."collectionMethod_id"
  LEFT JOIN igsn_resourcetype rt ON rt.id = r."resourceType_id"
  LEFT JOIN igsn_country co ON co.id = r.country_id
  LEFT JOIN igsn_navigationtype nt ON nt.id = r."navigationType_id"
  LEFT JOIN igsn_geologicalresource g ON g.resource_id = r.id
  LEFT JOIN igsn_geologicalage ga ON ga.id = g."geologicalAge_id"
  WHERE r."isPublic" AND r."parentIgsn_id" IS NULL
    AND coalesce(r."resourceIdentifier", '') <> ''
`;

const BATCH_SIZE = 500;

// Builds the read-only connection to the loaded legacy dump. Same server and
// credentials as the app, a different database (loaded by the makefile target).
function createLegacyDb() {
  return postgres({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 5432,
    database: process.env.LEGACY_DATABASE_NAME || "legacy_import",
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    onnotice: () => {},
  });
}

// Maps one validated create payload to the flat sample columns, published with
// its legacy IGSN. Mirrors insertSample's column composition, plus the
// publication columns and history timestamps a fresh insert would default.
function toSampleRow(
  row: LegacyRow,
  create: ReturnType<typeof createSampleSchema.parse>,
) {
  const publishedAt = row.publish_date ?? row.last_modified;
  return {
    id: uuidv7(),
    igsn: row.igsn.trim(),
    name: create.name,
    nature: create.nature,
    type: create.type ?? null,
    material: create.material ?? null,
    texture: create.texture ?? null,
    metamorphic_facies: create.metamorphicFacies ?? null,
    collection_method: create.collectionMethod ?? null,
    collection_method_description: create.collectionMethodDescription ?? null,
    specific_name: create.specificName ?? null,
    availability: create.availability ?? null,
    ...descriptionColumns(create.description),
    ...locationColumns(create.location),
    ...conditionColumns(create.condition),
    ...scientificContextColumns(create.scientificContext),
    ...toAgeColumns(create.age),
    ...securityColumns(create.security),
    ...economicInterestColumns(create),
    published: true,
    publication_year: publishedAt.getUTCFullYear(),
    created_at: publishedAt,
    updated_at: row.last_modified,
  };
}

async function main() {
  const legacy = createLegacyDb();
  const db = createDb();
  // On conflict, refresh every column from the new row except the identity
  // (id) and the original creation time, so a rerun updates in place.
  const preserved = new Set(["id", "igsn", "created_at"]);

  const summary = {
    read: 0,
    imported: 0,
    skippedUnknownMaterial: 0,
    skippedInvalid: 0,
    collectionMethodDropped: 0,
    typeUnmapped: 0,
    countryDropped: 0,
  };
  const sampleErrors: string[] = [];

  try {
    const rows = (await legacy.unsafe(LEGACY_QUERY)) as unknown as LegacyRow[];
    summary.read = rows.length;

    let batch: ReturnType<typeof toSampleRow>[] = [];
    const flush = async () => {
      if (batch.length === 0) return;
      const rowsToInsert = batch;
      const updatable = (
        Object.keys(rowsToInsert[0]!) as (keyof DB["sample"])[]
      ).filter((column) => !preserved.has(column));
      await db
        .insertInto("sample")
        .values(rowsToInsert)
        .onConflict((oc) =>
          oc
            .column("igsn")
            .doUpdateSet((eb) =>
              Object.fromEntries(
                updatable.map((column) => [
                  column,
                  eb.ref(`excluded.${column}`),
                ]),
              ),
            ),
        )
        .execute();
      summary.imported += rowsToInsert.length;
      batch = [];
    };

    for (const row of rows) {
      // Import only when the material path matches the start of a complete path
      // the tree supports (incomplete is fine). An unsupported path, or an absent
      // material, is skipped whole; it comes in on a re-import once supported.
      if (!isKnownMaterialPath(row.classification, row.material)) {
        summary.skippedUnknownMaterial += 1;
        continue;
      }
      // Count vocabulary values the new tree could not place, for transparency.
      if (
        row.collection_method &&
        !mapCollectionMethod(row.collection_method)
      ) {
        summary.collectionMethodDropped += 1;
      }
      if (row.resource_type && !mapResourceType(row.resource_type).type) {
        summary.typeUnmapped += 1;
      }
      if (row.country && !mapCountry(row.country)) summary.countryDropped += 1;

      const parsed = createSampleSchema.safeParse(toCreateSample(row));
      if (!parsed.success) {
        summary.skippedInvalid += 1;
        if (sampleErrors.length < 10) {
          sampleErrors.push(`${row.igsn}: ${parsed.error.issues[0]?.message}`);
        }
        continue;
      }
      batch.push(toSampleRow(row, parsed.data));
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();
  } finally {
    await legacy.end();
    await db.destroy();
  }

  console.info("Legacy import complete:", summary);
  if (sampleErrors.length > 0) {
    console.info("First skipped rows:", sampleErrors);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
