import type { Laboratory } from "../src/institutional-group/laboratory.ts";
import type { Osu } from "../src/institutional-group/osu.ts";

const HEADER = `// Generated from a CSV export, then refreshed from RNSR; do not edit by hand
// for bulk changes. Refresh with: pnpm --filter @projet-igsn/domain
// sync-institutions (CSV export) or sync-rnsr (RNSR)`;

const optional = (key: string, value: unknown) =>
  value === undefined ? "" : `, ${key}: ${JSON.stringify(value)}`;

export function emitOsus(osus: readonly Osu[]): string {
  const rows = osus
    .map(
      (osu) =>
        `  { id: ${JSON.stringify(osu.id)}, code: ${JSON.stringify(osu.code)}${optional("formerCodes", osu.formerCodes)}, name: ${JSON.stringify(osu.name)}, organizationRors: ${JSON.stringify(osu.organizationRors)} },`,
    )
    .join("\n");

  return `import { z } from "zod";

${HEADER}
export type Osu = {
  id: string;
  code: string;
  formerCodes?: readonly string[];
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
        `  { id: ${JSON.stringify(laboratory.id)}, code: ${JSON.stringify(laboratory.code)}${optional("formerCodes", laboratory.formerCodes)}, acronym: ${JSON.stringify(laboratory.acronym)}, name: ${JSON.stringify(laboratory.name)}, osu: ${JSON.stringify(laboratory.osu)}, organizationRors: ${JSON.stringify(laboratory.organizationRors)}${optional("replacedBy", laboratory.replacedBy)} },`,
    )
    .join("\n");

  return `import { z } from "zod";

${HEADER}
export type Laboratory = {
  id: string;
  code: string;
  formerCodes?: readonly string[];
  acronym: string;
  name: string;
  osu: string | null;
  organizationRors: readonly string[];
  replacedBy?: string;
};

export const LABORATORIES: readonly Laboratory[] = [
${rows}
];

// ponytail: format only like osuCodeSchema, membership enforced by the cascade validator
export const laboratoryCodeSchema = z.string().trim().min(1);
`;
}
