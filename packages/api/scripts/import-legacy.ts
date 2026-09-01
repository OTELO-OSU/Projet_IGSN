import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../src/db.ts";

import { createDb } from "../src/db.ts";
import { replaceSampleLinks } from "../src/sample/service/replace-sample-links.ts";
import { sampleColumns } from "../src/sample/service/sample-columns.ts";
import {
  type LegacyOwner,
  type LegacyRow,
  droppedDoiLinks,
  toCreateSample,
  toOwner,
  unmappableValues,
} from "./import-legacy-mapping.ts";

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
    ga.nom AS geological_age,
    au.email AS owner_email,
    au.first_name AS owner_first_name,
    au.last_name AS owner_last_name,
    (
      SELECT coalesce(array_agg(rr.nom ORDER BY rr.id), '{}')
      FROM igsn_relatedresource rr
      JOIN igsn_identifiertype it ON it.id = rr."identifierType_id"
      WHERE rr.resource_id = r.id AND it.nom = 'DOI'
    ) AS doi_related_resources
  FROM igsn_resource r
  LEFT JOIN igsn_personnehasresource phr ON phr.resource_id = r.id
  LEFT JOIN igsn_personne p ON p.id = phr.user_id
  LEFT JOIN auth_user au ON au.id = p.user_id
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

function toSampleRow(
  row: LegacyRow,
  create: ReturnType<typeof createSampleSchema.parse>,
  igsn: string,
) {
  const publishedAt = row.publish_date ?? row.last_modified;
  return {
    id: uuidv7(),
    igsn,
    ...sampleColumns(create),
    status: "published" as const,
    publication_year: publishedAt.getUTCFullYear(),
    created_at: publishedAt,
    updated_at: row.last_modified,
  };
}

async function main() {
  const legacy = createLegacyDb();
  const db = createDb();
  const preserved = new Set(["id", "igsn", "created_at"]);

  const summary = { read: 0, imported: 0, users: 0, linked: 0, links: 0 };
  const skipped: { igsn: string; reason: string; value: string }[] = [];
  const droppedLinks: { igsn: string; value: string }[] = [];

  try {
    const rows = (await legacy.unsafe(LEGACY_QUERY)) as unknown as LegacyRow[];
    summary.read = rows.length;

    let batch: ReturnType<typeof toSampleRow>[] = [];
    const sampleIdByIgsn = new Map<string, string>();
    const ownerByIgsn = new Map<string, LegacyOwner>();
    const linksByIgsn = new Map<
      string,
      NonNullable<ReturnType<typeof createSampleSchema.parse>["links"]>
    >();
    const flush = async () => {
      if (batch.length === 0) return;
      const rowsToInsert = batch;
      const updatable = (
        Object.keys(rowsToInsert[0]!) as (keyof DB["sample"])[]
      ).filter((column) => !preserved.has(column));
      const stored = await db
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
        .returning(["id", "igsn"])
        .execute();
      for (const { id, igsn } of stored) if (igsn) sampleIdByIgsn.set(igsn, id);
      summary.imported += rowsToInsert.length;
      batch = [];
    };

    for (const row of rows) {
      const igsn = igsnSchema.safeParse(row.igsn);
      if (!igsn.success) {
        skipped.push({
          igsn: row.igsn,
          reason: "invalid_igsn",
          value: row.igsn,
        });
        continue;
      }
      const issues = unmappableValues(row);
      if (issues.length > 0) {
        for (const issue of issues) {
          skipped.push({
            igsn: igsn.data,
            reason: issue.field,
            value: issue.value,
          });
        }
        continue;
      }
      const parsed = createSampleSchema.safeParse(toCreateSample(row));
      if (!parsed.success) {
        skipped.push({
          igsn: igsn.data,
          reason: "invalid_schema",
          value: parsed.error.issues[0]?.message ?? "",
        });
        continue;
      }
      const owner = toOwner(row);
      if (owner) ownerByIgsn.set(igsn.data, owner);
      if (parsed.data.links?.length)
        linksByIgsn.set(igsn.data, parsed.data.links);
      for (const value of droppedDoiLinks(row.doi_related_resources)) {
        droppedLinks.push({ igsn: igsn.data, value });
      }
      batch.push(toSampleRow(row, parsed.data, igsn.data));
      if (batch.length >= BATCH_SIZE) await flush();
    }
    await flush();

    for (const [igsn, links] of linksByIgsn) {
      const sampleId = sampleIdByIgsn.get(igsn);
      if (!sampleId) continue;
      await replaceSampleLinks(db, sampleId, links);
      summary.links += links.length;
    }

    const owners = new Map(
      [...ownerByIgsn.values()].map((owner) => [owner.email, owner]),
    );
    if (owners.size > 0) {
      const users = await db
        .insertInto("user")
        .values(
          [...owners.values()].map((owner) => ({ id: uuidv7(), ...owner })),
        )
        .onConflict((oc) =>
          oc.column("email").doUpdateSet((eb) => ({
            name: eb.ref("excluded.name"),
            firstname: eb.ref("excluded.firstname"),
          })),
        )
        .returning(["id", "email"])
        .execute();
      summary.users = users.length;
      const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));
      const links = [...ownerByIgsn.entries()].flatMap(([igsn, owner]) => {
        const sampleId = sampleIdByIgsn.get(igsn);
        const userId = userIdByEmail.get(owner.email);
        return sampleId && userId
          ? [{ user_id: userId, sample_id: sampleId, role: "owner" as const }]
          : [];
      });
      for (let i = 0; i < links.length; i += BATCH_SIZE) {
        await db
          .insertInto("user_sample")
          .values(links.slice(i, i + BATCH_SIZE))
          .onConflict((oc) => oc.columns(["user_id", "sample_id"]).doNothing())
          .execute();
      }
      summary.linked = links.length;
    }
  } finally {
    await legacy.end();
    await db.destroy();
  }

  for (const { igsn, reason, value } of skipped) {
    console.info(`skipped\t${igsn}\t${reason}\t${value}`);
  }
  for (const { igsn, value } of droppedLinks) {
    console.info(`dropped_link\t${igsn}\t${value}`);
  }

  const byReason: Record<string, number> = {};
  for (const { reason } of skipped)
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  console.info("Legacy import complete:", {
    ...summary,
    skipped: summary.read - summary.imported,
    droppedLinks: droppedLinks.length,
  });
  console.info("Skips by reason:", byReason);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
