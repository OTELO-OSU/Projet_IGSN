import "@xyflow/react/dist/style.css";
import type { SampleLineageNode } from "@projet-igsn/domain/sample/lineage/model";
import type { Node, NodeProps, NodeTypes } from "@xyflow/react";

import { Link } from "@tanstack/react-router";
import { Handle, Position, ReactFlow } from "@xyflow/react";

import type { LineageEdge } from "#/domain/samples/layout-lineage.ts";

import {
  NODE_HEIGHT,
  NODE_WIDTH,
  layoutLineage,
} from "#/domain/samples/layout-lineage.ts";
import { m } from "#/paraglide/messages.js";

export type LineageGraphNode =
  | ({ kind: "sample" } & SampleLineageNode)
  | { kind: "more"; id: string; generation: number; count: number };

type SampleNodeType = Node<
  { name: string; igsn: string; generation: number; tombstone: boolean },
  "sample"
>;
type MoreNodeType = Node<{ count: number }, "more">;
type LineageNodeType = SampleNodeType | MoreNodeType;

function relationLabel(generation: number): string {
  if (generation === 0) return m.lineage_relation_current();
  if (generation === -1) return m.lineage_relation_parent();
  if (generation === 1) return m.lineage_relation_child();
  return generation < 0
    ? m.lineage_relation_ancestor({ generation: -generation })
    : m.lineage_relation_descendant({ generation });
}

function SampleNode({ data }: NodeProps<SampleNodeType>) {
  const name = <span className="font-medium break-words">{data.name}</span>;
  // The tree already shows the relationship; assistive tech cannot see it.
  const relation = relationLabel(data.generation);

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div
        className={`flex h-full flex-col items-center justify-center rounded border px-3 text-center text-sm ${
          data.generation === 0
            ? "border-sky-800 bg-sky-800 text-white"
            : "border-sky-200 bg-white"
        }`}
      >
        {data.generation === 0 ? (
          <>
            {name} <span className="text-xs">{relation}</span>
          </>
        ) : data.tombstone ? (
          // A tombstoned sample's own page answers 404, so it is named, not linked.
          <span className="flex flex-col items-center text-sky-900/80">
            {name} <span className="sr-only">{relation}</span>
          </span>
        ) : (
          <Link
            to="/samples/$igsn"
            params={{ igsn: data.igsn }}
            className="nodrag nopan flex flex-col items-center text-sky-800 underline"
          >
            {name} <span className="sr-only">{relation}</span>
          </Link>
        )}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </>
  );
}

function MoreNode({ data }: NodeProps<MoreNodeType>) {
  return (
    <div
      title={m.lineage_more_hint({ count: data.count })}
      className="flex h-full items-center justify-center rounded border border-dashed border-sky-200 px-3 text-sm text-sky-900/70"
    >
      {m.lineage_more({ count: data.count })}
    </div>
  );
}

const nodeTypes: NodeTypes = { sample: SampleNode, more: MoreNode };

const toFlowNode = (
  node: LineageGraphNode & { x: number; y: number },
): LineageNodeType => ({
  id: node.id,
  position: { x: node.x, y: node.y },
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  // React Flow sets pointer-events none on a node that is neither selectable
  // nor draggable, and the link inside inherits it. node.style wins over that.
  style: { pointerEvents: "all" },
  ...(node.kind === "more"
    ? { type: "more" as const, data: { count: node.count } }
    : {
        type: "sample" as const,
        data: {
          name: node.name,
          igsn: node.igsn,
          generation: node.generation,
          tombstone: node.tombstone,
        },
      }),
});

export function LineageGraph({
  nodes,
  edges,
  zoomable = false,
}: {
  nodes: LineageGraphNode[];
  edges: LineageEdge[];
  zoomable?: boolean;
}) {
  return (
    <ReactFlow<LineageNodeType>
      nodes={layoutLineage(nodes, edges).map(toFlowNode)}
      edges={edges.map(({ parentId, childId }) => ({
        id: `${parentId}-${childId}`,
        source: parentId,
        target: childId,
      }))}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      disableKeyboardA11y
      zoomOnDoubleClick={false}
      zoomOnScroll={zoomable}
      preventScrolling={zoomable}
    />
  );
}
