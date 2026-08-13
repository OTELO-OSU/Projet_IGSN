export function ancestorPaths(path: string): string[] {
  const segments = path.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
}
