import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { createDb } from "./src/db.ts";
import { createSampleRepository } from "./src/sample/repository.ts";

const samples: CreateSample[] = [
  { name: "Basalte du Massif Central", nature: "hand_sample" },
  { name: "Grès de Fontainebleau", nature: "rock_powder" },
  { name: "Granite de Bretagne", nature: "thin_section" },
  { name: "Calcaire du Jura", nature: "rock_chips" },
  { name: "Schiste des Ardennes", nature: "polished_section" },
];

const db = createDb();
const repository = createSampleRepository(db);

for (const sample of samples) {
  const created = await repository.create(sample);
  console.info(`seeded sample "${created.name}" (${created.id})`);
}

await db.destroy();
