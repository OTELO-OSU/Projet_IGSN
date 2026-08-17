import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("name", "text")
    .addColumn("firstname", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // ponytail: no index on sample_id alone: nothing looks a sample's owners up
  // yet, and the only cascade delete is the seed reset. Add one if either changes.
  await db.schema
    .createTable("user_sample")
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("sample_id", "uuid", (col) =>
      col.notNull().references("sample.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("user_sample_pkey", ["user_id", "sample_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("user_sample").execute();
  await db.schema.dropTable("user").execute();
}
