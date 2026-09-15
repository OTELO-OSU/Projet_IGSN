import type { CoreContextCategory } from "./core-classification-schema.ts";

export function contextCategoryFinders(categories: CoreContextCategory[]) {
  return {
    bySchemeName: <S extends CoreContextCategory["schemeName"]>(
      schemeName: S,
    ) =>
      categories.find(
        (concept): concept is Extract<CoreContextCategory, { schemeName: S }> =>
          concept.schemeName === schemeName,
      ),
    byNotation: <N extends string>(notation: N) =>
      categories.find(
        (concept): concept is Extract<CoreContextCategory, { notation: N }> =>
          concept.notation === notation,
      ),
  };
}
