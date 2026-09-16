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

export const transactionally =
  <DB>(db: Transactional<DB>) =>
  <A extends unknown[], R>(
    fn: (trx: Transaction<DB>, ...args: A) => Promise<R>,
  ) =>
  (...args: A): Promise<R> =>
    withTransaction(db, (trx) => fn(trx, ...args));
