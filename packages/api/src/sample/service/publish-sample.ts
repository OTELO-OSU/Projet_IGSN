import type { Sample } from "@projet-igsn/domain/sample/sample";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { withSampleChildren } from "./with-sample-children.ts";

export async function publishSample(
  db: Transactional<DB>,
  id: string,
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    .set({ published: true, igsn: generateIgsnSuffix(id) })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  if (!row) return null;
  const [sample] = await withSampleChildren(db, [row]);
  return sample!;
}
