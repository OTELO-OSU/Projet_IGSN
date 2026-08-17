import { type Kysely } from "kysely";

const REMOVED_LABORATORIES = [
  "CRPG",
  "GEORESSOURCES",
  "GEOSCIENCES-RENNES",
  "ISTERRE",
  "LAB-BRGM",
];
const REMOVED_OSUS = ["OSUR"];

const GROUP = {
  institutional_organization: "02feahw73",
  institutional_osu: "OTELo",
  institutional_laboratory: "UAR3562",
} as const;

type Groups = {
  institutional_organization: string | null;
  institutional_osu: string | null;
  institutional_laboratory: string | null;
};

const TABLES = ["user", "sample"] as const;

export async function up(
  db: Kysely<{ user: Groups; sample: Groups }>,
): Promise<void> {
  for (const table of TABLES) {
    await db
      .updateTable(table)
      .set(GROUP)
      .where((eb) =>
        eb.or([
          eb("institutional_laboratory", "in", REMOVED_LABORATORIES),
          eb("institutional_osu", "in", REMOVED_OSUS),
        ]),
      )
      .execute();
  }
}

export async function down(): Promise<void> {}
