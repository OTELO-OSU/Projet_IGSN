import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../db.ts";

import { getSample } from "../sample/service/get-sample.ts";
import { type Transactional } from "../transaction.ts";

const NOBODY = "00000000-0000-0000-0000-000000000000";

export async function readSample(
  db: Transactional<DB>,
  id: string,
): Promise<Sample | null> {
  return (await getSample(db, id, NOBODY))?.sample ?? null;
}
