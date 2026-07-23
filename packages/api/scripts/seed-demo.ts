import { createDb } from "../src/db.ts";
import { DEMO_SAMPLES } from "./seed-demo-samples.ts";
import { seed } from "./seed.ts";

// Resets the database to the 100-sample demo dataset (70 published, 30 draft),
// so it is re-runnable. Wipes attachments and links first: they reference
// sample, so a preprod DB that already has them would otherwise fail the sample
// delete on the foreign key. Run directly (not via `pnpm run`) inside the api
// container: `node scripts/seed-demo.ts` (see makefile db-seed-demo).
const db = createDb();
await db.deleteFrom("sample_attachment").execute();
await db.deleteFrom("sample_link").execute();
await db.deleteFrom("sample").execute();
const created = await seed(db, DEMO_SAMPLES);
await db.destroy();

console.info(`seeded ${created.length} demo samples`);
