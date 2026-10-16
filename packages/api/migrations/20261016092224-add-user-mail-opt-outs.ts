import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("user")
    .addColumn("mail_opt_outs", sql`text[]`, (col) =>
      col.notNull().defaultTo(sql`'{}'`),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("user").dropColumn("mail_opt_outs").execute();
}
