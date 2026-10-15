import { findOsu } from "./find-osu.ts";
import { type Osu, OSUS } from "./osu.ts";

export function osuIdOf(code: string, osus: readonly Osu[] = OSUS): string {
  return findOsu(code, osus)?.id ?? code;
}
