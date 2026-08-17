import type { CreateSampleLink } from "@projet-igsn/domain/sample/link/model";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function replaceSampleLinks(
  db: Transactional<DB>,
  sampleId: string,
  links: CreateSampleLink[],
): Promise<void> {
  await db
    .deleteFrom("sample_link")
    .where("sample_id", "=", sampleId)
    .execute();
  if (links.length === 0) return;
  await db
    .insertInto("sample_link")
    .values(
      links.map((link) => ({
        id: uuidv7(),
        sample_id: sampleId,
        url: link.url,
        description: link.description ?? null,
      })),
    )
    .execute();
}
