import { createDb } from "../src/db.ts";
import { SEED_SAMPLES, seed } from "./seed.ts";

const db = createDb();
await db.deleteFrom("sample").execute();
await db.deleteFrom("user_managed_institutional_group").execute();
await db.deleteFrom("user_managed_manual_group").execute();
const created = await seed(db, SEED_SAMPLES);
await db.destroy();

console.log(JSON.stringify(created));
