import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

// Super admins moderate, they never collaborate: they are hidden from the
// directory search and read as unknown as a share target, so a share attempt
// never leaks who moderates.
export const collaboratableUsers = (db: Transactional<DB>) =>
  db.selectFrom("user").where("super_admin", "=", false);
