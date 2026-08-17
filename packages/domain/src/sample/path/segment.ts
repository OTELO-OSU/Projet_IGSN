export function pathSegment(path: string): string {
  return path.split(".").at(-1) as string;
}
