import { type Osu, OSUS } from "./osu.ts";

export function findOsu(
  code: string,
  osus: readonly Osu[] = OSUS,
): Osu | undefined {
  return osus.find(
    (osu) => osu.code === code || osu.formerCodes?.includes(code),
  );
}
