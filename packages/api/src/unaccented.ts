import { sql } from "kysely";

export const unaccented = (column: string) =>
  sql`immutable_unaccent(coalesce(${sql.ref(column)}, ''))`;
