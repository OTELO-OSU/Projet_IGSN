import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { selectSample } from "./select-sample.ts";
import { toSample } from "./to-sample.ts";

export async function listPublishedSamplesByIgsns(
  db: Transactional<DB>,
  igsns: string[],
): Promise<ReadonlyMap<string, Sample>> {
  if (igsns.length === 0) return new Map();
  const rows = await selectSample(db)
    .where("sample.igsn", "in", igsns)
    .where("sample.status", "=", "published")
    .execute();
  return new Map(
    rows.flatMap((row): [string, Sample][] =>
      row.igsn === null ? [] : [[row.igsn, toSample(row)]],
    ),
  );
}
