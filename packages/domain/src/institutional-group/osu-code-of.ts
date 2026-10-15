import { OSUS } from "./osu.ts";

export function osuCodeOf(id: string): string {
  return OSUS.find((osu) => osu.id === id)?.code ?? id;
}
