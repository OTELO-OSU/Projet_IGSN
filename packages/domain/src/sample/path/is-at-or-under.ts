// True when `path` is `ancestor` itself or a descendant of it (`${ancestor}.`),
// never a sibling that merely shares the prefix (`yes.mineral_and_ore_other`).
// The shared subtree test for the dot-path vocabularies, e.g. gating the
// economic-interest detail on a `yes` answer or its elements on mineral_and_ore.
export function isPathAtOrUnder(
  path: string | null | undefined,
  ancestor: string,
): boolean {
  return path === ancestor || (path?.startsWith(`${ancestor}.`) ?? false);
}
