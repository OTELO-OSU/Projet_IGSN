import { SHARED_SEED_ENV, resetAndSeed } from "./db";

export default function globalSetup() {
  process.env[SHARED_SEED_ENV] = JSON.stringify(resetAndSeed());
}
