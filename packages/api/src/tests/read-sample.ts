import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../db.ts";

import { getSample } from "../sample/service/get-sample.ts";
import { type Transactional } from "../transaction.ts";

// A uuid no seeded user has, so `owned` is always false.
const NOBODY = "00000000-0000-0000-0000-000000000000";

// Reads a sample the way a persistence round-trip wants it: just the row, with
// no owner in the picture. Ownership is covered by get-sample.spec.ts and the
// admin route specs.
export async function readSample(
  db: Transactional<DB>,
  id: string,
): Promise<Sample | null> {
  return (await getSample(db, id, NOBODY))?.sample ?? null;
}
