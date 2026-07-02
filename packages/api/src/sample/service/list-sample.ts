import type {
  ListSamplesParams,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toSample } from "./to-sample.ts";

export async function listSamples(
  db: Transactional<DB>,
  { page, perPage }: ListSamplesParams,
): Promise<ListSamplesResult> {
  const rows = await db
    .selectFrom("sample")
    .selectAll()
    .orderBy("updated_at", "desc")
    .orderBy("id", "desc")
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute();

  const { count } = await db
    .selectFrom("sample")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();

  return { data: rows.map(toSample), total: Number(count) };
}
