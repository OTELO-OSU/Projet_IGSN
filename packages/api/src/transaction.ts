import type { Kysely, Transaction } from "kysely";

export type Transactional<DB> = Kysely<DB> | Transaction<DB>;

export function withTransaction<DB, T>(
  db: Transactional<DB>,
  fn: (trx: Transaction<DB>) => Promise<T>,
): Promise<T> {
  return db.isTransaction
    ? fn(db as Transaction<DB>)
    : db.transaction().execute(fn);
}
