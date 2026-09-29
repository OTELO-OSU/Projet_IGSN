import { sql, type Transaction } from "kysely";

import type { DB } from "../../db.ts";

export async function reserveInternalNumbers(
  trx: Transaction<DB>,
  count: number,
): Promise<number[]> {
  await sql`lock table sample in share row exclusive mode`.execute(trx);
  const { rows } = await sql<{ last: string }>`
    select setval(
      'sample_internal_number_seq',
      nextval('sample_internal_number_seq') + ${count} - 1
    ) as last
  `.execute(trx);
  const first = Number(rows[0]!.last) - count + 1;
  return Array.from({ length: count }, (_, index) => first + index);
}
