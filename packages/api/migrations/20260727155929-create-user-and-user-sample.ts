import { type Kysely, sql } from "kysely";

// The local user store and the sample owners (ADR 0019). A user is provisioned
// from the verified token, keyed by email; name/firstname are nullable because
// the IdP may release neither. user_sample is the many-to-many: one sample can
// have several users and one user several samples. No role column yet, so a row
// means "owner".
//
// "user" is a reserved word in Postgres. Kysely quotes every identifier, so the
// builder is fine; hand-written sql fragments must spell it "user".
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

  // ponytail: the composite primary key indexes (user_id, sample_id), which
  // serves both reads we make (a user's samples, one user's access to one
  // sample). No index on sample_id alone: nothing looks a sample's owners up yet,
  // and the only cascade delete is the seed reset. Add one if either changes.
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
