export function hasUnattachable(
  submitted: string[],
  allowed: string[],
): boolean {
  const attachable = new Set(allowed);
  return submitted.some((id) => !attachable.has(id));
}
