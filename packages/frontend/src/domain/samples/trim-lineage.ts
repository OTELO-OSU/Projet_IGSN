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
  {
    maxGenerations,
    maxPerLevel,
  }: { maxGenerations: number; maxPerLevel: number },
): TrimmedLineage {
  const generations = [...new Set(nodes.map((node) => node.generation))].filter(
    (generation) => Math.abs(generation) <= maxGenerations,
  );
  const outwardFromCentre = [
    ...generations.filter((generation) => generation < 0).sort((a, b) => b - a),
    ...generations.filter((generation) => generation > 0).sort((a, b) => a - b),
  ];

  const kept = new Set(
    nodes.filter((node) => node.generation === 0).map((node) => node.id),
  );
  const dropped: Record<number, number> = {};
  for (const generation of outwardFromCentre) {
    const level = nodes.filter((node) => node.generation === generation);
    const shown = level
      .filter((node) => innerNeighbours(node, edges).some((id) => kept.has(id)))
      .slice(0, maxPerLevel);
    shown.forEach(({ id }) => kept.add(id));
    if (shown.length < level.length) {
      dropped[generation] = level.length - shown.length;
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
