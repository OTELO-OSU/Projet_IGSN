import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

export const VIRTUAL_SAMPLE_TYPE_ROOT = "serie_of_sample";

export function isVirtualSample(type: string | null): boolean {
  return isPathAtOrUnder(type, VIRTUAL_SAMPLE_TYPE_ROOT);
}
