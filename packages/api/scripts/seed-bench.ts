import { faker } from "@faker-js/faker";
import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";
import { osuIdOf } from "@projet-igsn/domain/institutional-group/osu-id-of";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
import { allowsSpecificName } from "@projet-igsn/domain/sample/material/allows-specific-name";
import { isMaterialComplete } from "@projet-igsn/domain/sample/material/is-complete";
import { allowsMineralClassifications } from "@projet-igsn/domain/sample/mineral/allows-mineral-classifications";
import { NATURES } from "@projet-igsn/domain/sample/nature";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { texturesFor } from "@projet-igsn/domain/sample/texture/vocabulary";
import { isSampleTypeComplete } from "@projet-igsn/domain/sample/type/is-complete";
import { sql } from "kysely";
import { parseArgs } from "node:util";
import { v7 as uuidv7 } from "uuid";

import { createDb } from "../src/db.ts";
import { collectionDateColumns } from "../src/sample/service/description-columns.ts";
import { FACET_VALUES } from "./bench-lib.ts";
import { scatteredSeedSampleName } from "./seed-sample-name.ts";

const BATCH_SIZE = 1000;
const CONCURRENCY = 8;

const ROCK_NAMES = [
  "Granite",
  "Basalt",
  "Gneiss",
  "Schist",
  "Limestone",
  "Sandstone",
  "Marble",
  "Quartzite",
  "Rhyolite",
  "Andesite",
];

const { values } = parseArgs({
  options: { count: { type: "string", default: "50000" } },
});
const count = Number(values.count);

const randomPath = (key: string) =>
  faker.helpers.arrayElement(FACET_VALUES[key]!);

// A synthetic sample needs synthesis details the bench does not seed.
const PUBLISHABLE_TYPE_MATERIALS = FACET_VALUES.type!.filter(
  isSampleTypeComplete,
).flatMap((type) =>
  FACET_VALUES.material!.filter(
    (material) =>
      isMaterialComplete(material, type) && !isSyntheticMaterial(material),
  ).map((material) => ({ type, material })),
);

const db = createDb();
const ownerIds = (
  await db
    .selectFrom("user")
    .select("id")
    .where("status", "=", "accepted")
    .execute()
).map((user) => user.id);
if (ownerIds.length === 0) {
  throw new Error("no accepted user to own the bench samples");
}
const groupIds = (
  await db.selectFrom("manual_group").select("id").execute()
).map((group) => group.id);

function benchSample(id: string, position: number) {
  const laboratory = faker.helpers.arrayElement(LABORATORIES);
  const { type, material } = faker.helpers.arrayElement(
    PUBLISHABLE_TYPE_MATERIALS,
  );
  const ageMin = faker.number.int({ min: 0, max: 500 });
  const collectedOn = faker.date.past({ years: 30 }).toISOString().slice(0, 10);
  return {
    id,
    status: "published" as const,
    igsn: generateIgsnSuffix(id),
    published_at: sql<Date>`now()`,
    internal_number: sql<number>`nextval('sample_internal_number_seq')`,
    name: scatteredSeedSampleName(position),
    specific_name: allowsSpecificName(material)
      ? `${faker.helpers.arrayElement(ROCK_NAMES)} ${faker.location.city()}`
      : null,
    nature: faker.helpers.arrayElement(NATURES),
    texture: faker.helpers.arrayElement([null, ...texturesFor(material)]),
    type,
    material,
    collection_method: randomPath("collectionMethod"),
    location_id: allowsLocation(material) ? id : null,
    ...collectionDateColumns({
      precision: "day",
      start: collectedOn,
      end: collectedOn,
    }),
    numeric_age_min: ageMin,
    numeric_age_max: ageMin + faker.number.int({ max: 100 }),
    numeric_age_unit: "ma",
    existence_status: "exists",
    availability_status: "available",
    sc_provenance_status: "research_project_sample",
    sc_host_institution:
      faker.helpers.maybe(() =>
        faker.helpers.arrayElements(
          ORGANIZATIONS.map((organization) => organization.ror),
          { min: 1, max: 2 },
        ),
      ) ?? null,
    sc_collector_firstname: faker.person.firstName(),
    sc_collector_lastname: faker.person.lastName(),
    institutional_organization: faker.helpers.arrayElement(
      laboratory.organizationRors,
    ),
    institutional_osu: laboratory.osu && osuIdOf(laboratory.osu),
    institutional_laboratory: laboratory.id,
  };
}

async function seedBatch(size: number, offset: number) {
  const ids = Array.from({ length: size }, () => uuidv7());
  const samples = ids.map((id, row) => benchSample(id, offset + row));
  await db.transaction().execute(async (trx) => {
    const located = samples.filter((sample) => sample.location_id !== null);
    if (located.length > 0) {
      await trx
        .insertInto("location")
        .values(
          located.map(({ id }) => ({
            id,
            location_type: "point",
            point_longitude: faker.location.longitude(),
            point_latitude: faker.location.latitude(),
          })),
        )
        .execute();
    }
    await trx.insertInto("sample").values(samples).execute();
    await trx
      .insertInto("user_sample")
      .values(
        ids.map((id) => ({
          sample_id: id,
          user_id: faker.helpers.arrayElement(ownerIds),
          role: "owner" as const,
        })),
      )
      .execute();
    const grouped = ids.filter(() => faker.datatype.boolean(0.2));
    if (grouped.length > 0 && groupIds.length > 0) {
      await trx
        .insertInto("sample_manual_group")
        .values(
          grouped.map((id) => ({
            sample_id: id,
            group_id: faker.helpers.arrayElement(groupIds),
          })),
        )
        .execute();
    }
    const classified = samples.filter((sample) =>
      allowsMineralClassifications(sample.material),
    );
    if (classified.length > 0) {
      await trx
        .insertInto("mineral_classification")
        .values(
          classified.map(({ id }) => ({
            id: uuidv7(),
            sample_id: id,
            strunz_id: randomPath("mineralClassification"),
          })),
        )
        .execute();
    }
  });
}

const batchSizes = Array.from(
  { length: Math.ceil(count / BATCH_SIZE) },
  (_, index) => Math.min(BATCH_SIZE, count - index * BATCH_SIZE),
);
let seeded = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async (_, worker) => {
    for (let index = worker; index < batchSizes.length; index += CONCURRENCY) {
      await seedBatch(batchSizes[index]!, index * BATCH_SIZE);
      seeded += batchSizes[index]!;
      console.info(`seeded ${seeded}/${count} bench samples`);
    }
  }),
);

await db.destroy();
