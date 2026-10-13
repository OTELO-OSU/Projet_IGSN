import { normalizeSearch } from "../../text/normalize-search.ts";
import { MATERIAL_PATHS, MATERIAL_ROOTS } from "../material/classification.ts";
import { matchesSearchToken } from "./highlight-match.ts";
import { parseSearchToken } from "./search-tokens.ts";

const ROOTS: readonly string[] = MATERIAL_ROOTS;

export function createMatchingMaterialPaths(
  materialPathLabel: (path: string) => string,
): (token: string) => string[] {
  const labelled = MATERIAL_PATHS.filter((path) => !ROOTS.includes(path)).map(
    (path) => [path, normalizeSearch(materialPathLabel(path))] as const,
  );
  return (token) => {
    const parsed = parseSearchToken(normalizeSearch(token));
    return labelled
      .filter(([, label]) => matchesSearchToken(label, parsed))
      .map(([path]) => path);
  };
}
