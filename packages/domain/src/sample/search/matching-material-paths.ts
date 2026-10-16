import type { SearchTerm } from "./parse-search-query.ts";

import { normalizeSearch } from "../../text/normalize-search.ts";
import { MATERIAL_PATHS, MATERIAL_ROOTS } from "../material/classification.ts";
import { matchesSearchPhrase, matchesSearchToken } from "./highlight-match.ts";
import { parseSearchToken } from "./search-tokens.ts";

const ROOTS: readonly string[] = MATERIAL_ROOTS;

export function createMatchingMaterialPaths(
  materialPathLabel: (path: string) => string,
): (term: SearchTerm) => string[] {
  const labelled = MATERIAL_PATHS.filter((path) => !ROOTS.includes(path)).map(
    (path) => [path, normalizeSearch(materialPathLabel(path))] as const,
  );
  return (term) => {
    if (term.kind === "phrase") {
      return labelled
        .filter(([, label]) => matchesSearchPhrase(label, term.text))
        .map(([path]) => path);
    }
    const token = parseSearchToken(normalizeSearch(term.token));
    return labelled
      .filter(([, label]) => matchesSearchToken(label, token))
      .map(([path]) => path);
  };
}
