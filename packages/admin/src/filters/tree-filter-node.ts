import { normalizeSearch } from "#/filters/matches-search.ts";

export type TreeFilterNode = {
  key: string;
  label: string;
  value?: string;
  children: TreeFilterNode[];
};

function keepMatching(
  nodes: TreeFilterNode[],
  needle: string,
): TreeFilterNode[] {
  return nodes.flatMap((node) => {
    if (normalizeSearch(node.label).includes(needle)) return [node];
    const children = keepMatching(node.children, needle);
    return children.length === 0 ? [] : [{ ...node, children }];
  });
}

export function filterNodes(
  nodes: TreeFilterNode[],
  search: string,
): TreeFilterNode[] {
  if (search === "") return nodes;
  return keepMatching(nodes, normalizeSearch(search));
}
