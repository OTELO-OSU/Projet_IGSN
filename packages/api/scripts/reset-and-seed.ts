import { createDb } from "../src/db.ts";
import { MOCK_RESEARCHERS, SEED_SAMPLES, seed } from "./seed.ts";

// Resets the E2E database to a known baseline: wipe every sample, then insert
// the shared SEED_SAMPLES set. Prints the created rows as JSON on the last
// stdout line so the Playwright side reads their ids. Run inside the api
// container (`pnpm -F @projet-igsn/api seed:e2e`); see e2e/support/db.ts.
//
// Only the researchers whose specs browse the seeded samples own them (jean and
// pierre), unlike the dev seed which assigns all six. That leaves the others
// with an empty registry, so ownership isolation is testable (see
// e2e/admin/samples.spec.ts). Deleting the samples cascades user_sample.
const db = createDb();
await db.deleteFrom("sample").execute();
const created = await seed(db, SEED_SAMPLES, [
  MOCK_RESEARCHERS.jean,
  MOCK_RESEARCHERS.pierre,
]);
await db.destroy();

console.log(JSON.stringify(created));
