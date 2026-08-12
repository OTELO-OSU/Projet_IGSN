import type { Laboratory } from "../src/institutional-group/laboratory.ts";
import type { Osu } from "../src/institutional-group/osu.ts";

const HEADER = `// Generated from a CSV export; do not edit by hand for bulk changes. Refresh
// with: pnpm --filter @projet-igsn/domain sync-institutions`;

export function emitOsus(osus: readonly Osu[]): string {
  const rows = osus
    .map(
      (osu) =>
        `  { code: ${JSON.stringify(osu.code)}, name: ${JSON.stringify(osu.name)}, organizationRors: ${JSON.stringify(osu.organizationRors)} },`,
    )
    .join("\n");

  return `import { z } from "zod";

${HEADER}
export type Osu = {
  code: string;
  name: string;
  organizationRors: readonly string[];
};

export const OSUS: readonly Osu[] = [
${rows}
];

// ponytail: format only, not membership in OSUS, so a stored code survives a refresh of this list; the cascade validator owns membership
export const osuCodeSchema = z.string().trim().min(1);
`;
}

export function emitLaboratories(laboratories: readonly Laboratory[]): string {
  const rows = laboratories
    .map(
      (laboratory) =>
        `  { code: ${JSON.stringify(laboratory.code)}, acronym: ${JSON.stringify(laboratory.acronym)}, name: ${JSON.stringify(laboratory.name)}, osu: ${JSON.stringify(laboratory.osu)}, organizationRors: ${JSON.stringify(laboratory.organizationRors)} },`,
    )
    .join("\n");

  return `import { z } from "zod";

${HEADER}
export type Laboratory = {
  code: string;
  acronym: string;
  name: string;
  osu: string | null;
  organizationRors: readonly string[];
};

export const LABORATORIES: readonly Laboratory[] = [
${rows}
];

// ponytail: format only like osuCodeSchema, membership enforced by the cascade validator
export const laboratoryCodeSchema = z.string().trim().min(1);
`;
}

// A laboratory is the leaf of the organisme/OSU/laboratory trio, so losing it
// clears the three columns and re-opens the group form at the next login.
export function emitRemovedInstitutionsMigration({
  laboratories,
  osus,
}: {
  laboratories: readonly string[];
  osus: readonly string[];
}): string {
  const statements = [
    laboratories.length > 0 &&
      `    await db
      .updateTable(table)
      .set({
        institutional_organization: null,
        institutional_osu: null,
        institutional_laboratory: null,
      })
      .where("institutional_laboratory", "in", ${JSON.stringify(laboratories)})
      .execute();`,
    osus.length > 0 &&
      `    await db
      .updateTable(table)
      .set({ institutional_osu: null })
      .where("institutional_osu", "in", ${JSON.stringify(osus)})
      .execute();`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `import { type Kysely } from "kysely";

// Review it as you would a hand-written migration, and turn a clearing into a
// remap where a code was renamed rather than dropped.
type Groups = {
  institutional_organization: string | null;
  institutional_osu: string | null;
  institutional_laboratory: string | null;
};

export async function up(
  db: Kysely<{ user: Groups; sample: Groups }>,
): Promise<void> {
  for (const table of ["user", "sample"] as const) {
${statements}
  }
}

// The cleared codes are gone from the export, so there is nothing to restore.
export async function down(): Promise<void> {}
`;
}
