// A controlled vocabulary where each level refines its parent (type,
// sub-type, sub-sub-type...). A value is the dot-separated path from the
// root, e.g. "rock.igneous.volcanic"; an ancestor path is a valid, partial
// classification.
export type TaxonomyTree = { readonly [code: string]: TaxonomyTree };

export type TaxonomyPath<T extends TaxonomyTree> = {
  [K in keyof T & string]: K | `${K}.${TaxonomyPath<T[K]>}`;
}[keyof T & string];

export function taxonomyPaths<T extends TaxonomyTree>(
  tree: T,
): TaxonomyPath<T>[] {
  return walk(tree) as TaxonomyPath<T>[];
}

function walk(tree: TaxonomyTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([code, children]) => {
    const path = prefix ? `${prefix}.${code}` : code;
    return [path, ...walk(children, path)];
  });
}
