import { LABORATORIES } from "./laboratory.ts";
import { ORGANIZATIONS } from "./organization.ts";
import { OSUS } from "./osu.ts";

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

export function osuLabel(code: string): string {
  const osu = OSUS.find((candidate) => candidate.code === code);
  return osu ? `${osu.name} (${osu.code})` : code;
}

export function laboratoryLabel(code: string): string {
  const laboratory = LABORATORIES.find((candidate) => candidate.code === code);
  return laboratory ? `${laboratory.name} (${laboratory.acronym})` : code;
}
