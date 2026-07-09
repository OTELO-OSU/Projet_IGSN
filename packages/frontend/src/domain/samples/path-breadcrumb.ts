// Splits a dot-joined classification path (type, material) into its breadcrumb
// segments, labelling each ancestor. Every ancestor of a valid path is itself a
// valid member (domain flat-source-of-truth invariant), so labelling each
// prefix is safe. The UI renders these with a chevron between segments.
export function pathBreadcrumb<T extends string>(
  path: T,
  label: (segment: T) => string,
): { path: T; label: string }[] {
  const segments = path.split(".");
  return segments.map((_, index) => {
    const ancestor = segments.slice(0, index + 1).join(".") as T;
    return { path: ancestor, label: label(ancestor) };
  });
}
