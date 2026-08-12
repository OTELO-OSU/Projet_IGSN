import { type Kysely } from "kysely";

// Codes the CSV export dropped, read off the laboratory.ts / osu.ts diff.
const REMOVED_LABORATORIES = [
  "CRPG",
  "GEORESSOURCES",
  "GEOSCIENCES-RENNES",
  "ISTERRE",
  "LAB-BRGM",
];
const REMOVED_OSUS = ["OSUR"];

// A row keeping a dropped code points at nothing, so it moves to a valid triple
// in the new catalog, rather than being cleared.
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

// The overwritten codes no longer exist in laboratory.ts or osu.ts, so there is
// nothing to restore.
export async function down(): Promise<void> {}
