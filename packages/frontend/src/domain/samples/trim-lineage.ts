import type {
  SampleLineage,
  SampleLineageNode,
} from "@projet-igsn/domain/sample/lineage/model";

import type { LineageEdge } from "./layout-lineage.ts";

import { innerNeighbours } from "./layout-lineage.ts";

export type TrimmedLineage = {
  nodes: SampleLineageNode[];
  edges: LineageEdge[];
  dropped: Record<number, number>;
};

export function trimLineage(
  { nodes, edges }: SampleLineage,
  centerId: string,
  {
    maxGenerations,
    maxPerLevel,
  }: { maxGenerations: number; maxPerLevel: number },
): TrimmedLineage {
  const generations = [...new Set(nodes.map((node) => node.generation))].filter(
    (generation) => Math.abs(generation) <= maxGenerations,
  );
  const outward = [
    generations.filter((generation) => generation < 0).sort((a, b) => b - a),
    generations.filter((generation) => generation > 0).sort((a, b) => a - b),
  ];

  const kept = new Set([centerId]);
  const dropped: Record<number, number> = {};
  for (const direction of outward) {
    for (const generation of direction) {
      const level = nodes.filter((node) => node.generation === generation);
      const reachable = level.filter((node) =>
        innerNeighbours(node, edges).some((id) => kept.has(id)),
      );
      const shown = reachable.slice(0, maxPerLevel);
      for (const node of shown) {
        kept.add(node.id);
      }
      if (shown.length < level.length) {
        dropped[generation] = level.length - shown.length;
      }
    }
  }

  return {
    nodes: nodes.filter((node) => kept.has(node.id)),
    edges: edges.filter(
      ({ parentId, childId }) => kept.has(parentId) && kept.has(childId),
    ),
    dropped,
  };
}
