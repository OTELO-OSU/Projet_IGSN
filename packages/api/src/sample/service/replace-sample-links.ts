import type { CreateSampleLink } from "@projet-igsn/domain/sample/link/model";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

// Links live and die with their sample document: every save replaces them
// wholesale (ADR 0017). Fresh UUIDv7 ids in array order keep reads, which
// order by id, in the order the user entered.
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
