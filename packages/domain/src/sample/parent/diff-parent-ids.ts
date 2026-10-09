import type { SampleParent } from "./model.ts";

export const diffParentIds = (
  stored: readonly SampleParent[],
  submitted: readonly string[] | undefined,
): { added: string[]; removed: SampleParent[] } => {
  if (submitted === undefined) return { added: [], removed: [] };
  const storedIds = new Set(stored.map(({ id }) => id));
  return {
    added: submitted.filter((id) => !storedIds.has(id)),
    removed: stored.filter(({ id }) => !submitted.includes(id)),
  };
};
