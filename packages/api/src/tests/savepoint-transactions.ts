import { type Kysely, sql } from "kysely";

import type { DB } from "../db.ts";

export function savepointTransactions(db: Kysely<DB>): Kysely<DB> {
  const transaction = () => ({
    execute: async <T>(fn: (trx: Kysely<DB>) => Promise<T>): Promise<T> => {
      await sql`savepoint nested`.execute(db);
      try {
        const result = await fn(db);
        await sql`release savepoint nested`.execute(db);
        return result;
      } catch (error) {
        await sql`rollback to savepoint nested`.execute(db);
        throw error;
      }
    },
  });
  return new Proxy(db, {
    get: (target, key) => {
      if (key === "isTransaction") return false;
      if (key === "transaction") return transaction;
      const value: unknown = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
