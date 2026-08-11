import { LABORATORIES } from "./laboratory.ts";
import { OSUS } from "./osu.ts";

export function osuLabel(code: string): string {
  const osu = OSUS.find((candidate) => candidate.code === code);
  return osu ? `${osu.name} (${osu.code})` : code;
}

export function laboratoryLabel(code: string): string {
  const laboratory = LABORATORIES.find((candidate) => candidate.code === code);
  return laboratory ? `${laboratory.name} (${laboratory.acronym})` : code;
}
