import type { RawBuilder } from "kysely";

import { sql } from "kysely";

export const unaccented = (column: string | RawBuilder<unknown>) =>
  sql`immutable_unaccent(coalesce(${typeof column === "string" ? sql.ref(column) : column}, ''))`;
