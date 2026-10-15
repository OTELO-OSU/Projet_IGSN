import type { Laboratory } from "./laboratory.ts";

export function isOfferedLaboratory(
  { code, replacedBy }: Laboratory,
  selected?: string | null,
): boolean {
  return replacedBy === undefined || code === selected;
}
