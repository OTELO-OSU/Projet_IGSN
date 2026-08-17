export function isPathAtOrUnder(
  path: string | null | undefined,
  ancestor: string,
): boolean {
  return path === ancestor || (path?.startsWith(`${ancestor}.`) ?? false);
}
