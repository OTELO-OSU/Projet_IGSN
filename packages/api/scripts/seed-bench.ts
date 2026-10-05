import { faker } from "@faker-js/faker";
import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { LABORATORIES } from "@projet-igsn/domain/institutional-group/laboratory";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";
import { NATURES } from "@projet-igsn/domain/sample/nature";
import { TEXTURES } from "@projet-igsn/domain/sample/texture/vocabulary";
import { sql } from "kysely";
import { parseArgs } from "node:util";
import { v7 as uuidv7 } from "uuid";

import { createDb } from "../src/db.ts";
import { FACET_VALUES } from "./bench-lib.ts";
import { seedMockUsers } from "./seed.ts";

const BATCH_SIZE = 1000;

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

const db = createDb();
const ownerIds = Object.values(await seedMockUsers(db));
const groupIds = (
  await db.selectFrom("manual_group").select("id").execute()
).map((group) => group.id);

function benchSample(id: string) {
  const laboratory = faker.helpers.arrayElement(LABORATORIES);
  const ageMin = faker.number.int({ min: 0, max: 500 });
  return {
    id,
    status: "published" as const,
    igsn: generateIgsnSuffix(id),
    publication_year: 2025,
    published_at: sql<Date>`now()`,
    internal_number: sql<number>`nextval('sample_internal_number_seq')`,
    name: `${faker.helpers.arrayElement(ROCK_NAMES)} ${faker.location.city()}`,
    specific_name: faker.lorem.words(3),
    nature: faker.helpers.arrayElement(NATURES),
    texture: faker.helpers.arrayElement(TEXTURES),
    type: randomPath("type"),
    material: randomPath("material"),
    collection_method: randomPath("collectionMethod"),
    location_id: id,
    numeric_age_min: ageMin,
    numeric_age_max: ageMin + faker.number.int({ max: 100 }),
    numeric_age_unit: "ma",
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
    institutional_osu: laboratory.osu,
    institutional_laboratory: laboratory.code,
  };
}

for (let offset = 0; offset < count; offset += BATCH_SIZE) {
  const ids = Array.from({ length: Math.min(BATCH_SIZE, count - offset) }, () =>
    uuidv7(),
  );
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("location")
      .values(
        ids.map((id) => ({
          id,
          location_type: "point",
          point_longitude: faker.location.longitude(),
          point_latitude: faker.location.latitude(),
        })),
      )
      .execute();
    await trx.insertInto("sample").values(ids.map(benchSample)).execute();
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
    const classified = ids.filter(() => faker.datatype.boolean(0.1));
    if (classified.length > 0) {
      await trx
        .insertInto("mineral_classification")
        .values(
          classified.map((id) => ({
            id: uuidv7(),
            sample_id: id,
            strunz_id: randomPath("mineralClassification"),
          })),
        )
        .execute();
    }
  });
  console.info(`seeded ${offset + ids.length}/${count} bench samples`);
}

await db.destroy();
