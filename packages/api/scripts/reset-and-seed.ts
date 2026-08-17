import { createDb } from "../src/db.ts";
import { SEED_SAMPLES, seed } from "./seed.ts";

const db = createDb();
await db.deleteFrom("sample").execute();
const created = await seed(db, SEED_SAMPLES);
await db.destroy();

console.log(JSON.stringify(created));
