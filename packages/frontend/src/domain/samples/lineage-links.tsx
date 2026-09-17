import type { SampleLineageNode } from "@projet-igsn/domain/sample/lineage/model";

import { Link } from "@tanstack/react-router";

import { relationLabel } from "#/domain/samples/lineage-relation-label.ts";

export function LineageLinks({ nodes }: { nodes: SampleLineageNode[] }) {
  return (
    <ul className="sr-only">
      {nodes
        .filter((node) => node.generation !== 0)
        .map((node) => (
          <li key={node.id}>
            {node.tombstone ? (
              `${node.name} ${relationLabel(node.generation)}`
            ) : (
              <Link to="/samples/$igsn" params={{ igsn: node.igsn }}>
                {node.name} {relationLabel(node.generation)}
              </Link>
            )}
          </li>
        ))}
    </ul>
  );
}
