import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function unavailableInternalNumbers(
  db: Transactional<DB>,
  numbers: number[],
): Promise<Set<number>> {
  const { rows } = await sql<{ n: string }>`
    select n from unnest(${sql.val(numbers)}::bigint[]) as candidate(n)
    where n > (
      select case when is_called then last_value else last_value - 1 end
      from sample_internal_number_seq
    )
    or exists (select from sample where internal_number = n)
  `.execute(db);
  return new Set(rows.map((row) => Number(row.n)));
}
