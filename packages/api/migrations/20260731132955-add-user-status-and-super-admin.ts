import { type Kysely, sql } from "kysely";

// The CHECK mirrors userStatusSchema: the documented super-admin bootstrap is
// a hand-typed UPDATE (docs/preprod-deploy.md), so a status typo must fail at
// the statement rather than 500 on every request at userSchema.parse. Adding
// a status therefore takes a migration alongside the Zod enum.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("user")
    .addColumn("status", "text", (col) =>
      col
        .notNull()
        .defaultTo("pending")
        .check(sql`status in ('pending', 'accepted', 'rejected')`),
    )
    .addColumn("super_admin", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("user")
    .dropColumn("super_admin")
    .dropColumn("status")
    .execute();
}
