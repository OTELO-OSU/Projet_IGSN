import { findLaboratory } from "./find-laboratory.ts";
import { findOsu } from "./find-osu.ts";
import { ORGANIZATIONS } from "./organization.ts";

const labelByRor = new Map(
  ORGANIZATIONS.map((organization) => [
    organization.ror,
    organization.acronym
      ? `${organization.name} (${organization.acronym})`
      : organization.name,
  ]),
);

export function organizationLabel(ror: string): string {
  return labelByRor.get(ror) ?? ror;
}

export function organizationShortLabel(ror: string): string {
  const organization = ORGANIZATIONS.find((candidate) => candidate.ror === ror);
  return organization?.acronym ?? organization?.name ?? ror;
}

export function osuLabel(code: string): string {
  const osu = findOsu(code);
  return osu ? `${osu.name} (${osu.code})` : code;
}

export function laboratoryLabel(code: string): string {
  const laboratory = findLaboratory(code);
  return laboratory ? `${laboratory.name} (${laboratory.acronym})` : code;
}

export function laboratoryShortLabel(code: string): string {
  return findLaboratory(code)?.acronym ?? code;
}
