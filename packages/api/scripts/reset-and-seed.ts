import { createDb } from "../src/db.ts";
import { SEED_SAMPLES, seed } from "./seed.ts";

// Resets the E2E database to a known baseline: wipe every sample, then insert
// the shared SEED_SAMPLES set. Prints the created rows as JSON on the last
// stdout line so the Playwright side reads their ids. Run inside the api
// container (`pnpm -F @projet-igsn/api seed:e2e`); see e2e/support/db.ts.
const db = createDb();
await db.deleteFrom("sample").execute();
const created = await seed(db, SEED_SAMPLES);
await db.destroy();

console.log(JSON.stringify(created));
