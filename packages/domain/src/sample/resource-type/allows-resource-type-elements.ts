import { isPathAtOrUnder } from "../path/is-at-or-under.ts";

export function allowsResourceTypeElements(
  resourceType: string | null | undefined,
): boolean {
  return isPathAtOrUnder(resourceType, "mineral_and_ore");
}
