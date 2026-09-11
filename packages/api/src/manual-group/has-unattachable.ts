export function unattachableIndexes(
  submitted: string[],
  allowed: string[],
): number[] {
  const attachable = new Set(allowed);
  return submitted.flatMap((id, index) => (attachable.has(id) ? [] : [index]));
}

export function hasUnattachable(
  submitted: string[],
  allowed: string[],
): boolean {
  return unattachableIndexes(submitted, allowed).length > 0;
}
