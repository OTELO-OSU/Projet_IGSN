export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 60;

const X_GAP = 80;
const Y_GAP = 20;

export type LineageEdge = { parentId: string; childId: string };

type Placed = { id: string; generation: number };

export function innerNeighbours(
  node: Placed,
  edges: readonly LineageEdge[],
): string[] {
  if (node.generation === 0) {
    return [];
  }
  const isAncestor = node.generation < 0;
  return edges
    .filter((edge) => (isAncestor ? edge.parentId : edge.childId) === node.id)
    .map((edge) => (isAncestor ? edge.childId : edge.parentId));
}

function barycenter(
  node: Placed,
  edges: readonly LineageEdge[],
  ranks: Map<string, number>,
): number {
  const inner = innerNeighbours(node, edges)
    .map((id) => ranks.get(id))
    .filter((rank) => rank !== undefined);
  if (inner.length === 0) {
    return Infinity;
  }
  return inner.reduce((total, rank) => total + rank, 0) / inner.length;
}

const compareRank = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

export function layoutLineage<T extends Placed>(
  nodes: readonly T[],
  edges: readonly LineageEdge[],
): (T & { x: number; y: number })[] {
  const generations = [...new Set(nodes.map(({ generation }) => generation))];
  generations.sort((a, b) => Math.abs(a) - Math.abs(b));

  const ranks = new Map<string, number>();
  return generations.flatMap((generation) => {
    const level = nodes.filter((node) => node.generation === generation);
    const barycenters = new Map(
      level.map((node) => [node.id, barycenter(node, edges, ranks)]),
    );
    const ordered = [...level].sort((a, b) =>
      compareRank(
        barycenters.get(a.id) ?? Infinity,
        barycenters.get(b.id) ?? Infinity,
      ),
    );
    return ordered.map((node, rank) => {
      ranks.set(node.id, rank);
      return {
        ...node,
        x: generation * (NODE_WIDTH + X_GAP),
        y: (rank - (ordered.length - 1) / 2) * (NODE_HEIGHT + Y_GAP),
      };
    });
  });
}
