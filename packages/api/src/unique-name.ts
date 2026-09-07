import type { Transaction } from "kysely";

import { sql } from "kysely";

import type { DB } from "./db.ts";

// ponytail: name-keyed advisory lock rather than catching the unique violation.
export const lockName = (trx: Transaction<DB>, name: string) =>
  sql`select pg_advisory_xact_lock(hashtext(${name.toLowerCase()}))`.execute(
    trx,
  );

export const isNameTakenBy = async (
  trx: Transaction<DB>,
  table: "manual_group" | "service_account",
  name: string,
  exceptId: string,
) => {
  const taken = await trx
    .selectFrom(table)
    .select("id")
    .where(sql`lower(name)`, "=", name.toLowerCase())
    .where("id", "<>", exceptId)
    .executeTakeFirst();
  return taken !== undefined;
};
