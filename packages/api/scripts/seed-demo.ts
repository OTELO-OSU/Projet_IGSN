import { createDb } from "../src/db.ts";
import { DEMO_SAMPLES } from "./seed-demo-samples.ts";
import { seed } from "./seed.ts";

const db = createDb();
await db.deleteFrom("sample_attachment").execute();
await db.deleteFrom("sample_link").execute();
await db.deleteFrom("sample").execute();
const created = await seed(db, DEMO_SAMPLES);
await db.destroy();

console.info(`seeded ${created.length} demo samples`);
