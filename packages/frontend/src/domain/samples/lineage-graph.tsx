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
import { relationLabel } from "#/domain/samples/lineage-relation-label.ts";
import { m } from "#/paraglide/messages.js";

export type LineageGraphNode =
  | ({ kind: "sample" } & SampleLineageNode)
  | { kind: "more"; id: string; generation: number; count: number };

type SampleNodeType = Node<SampleLineageNode, "sample">;
type MoreNodeType = Node<{ count: number }, "more">;
type LineageNodeType = SampleNodeType | MoreNodeType;

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
            ? "border-primary bg-primary text-primary-foreground"
            : "border-primary/20 bg-white"
        }`}
      >
        {data.generation === 0 ? (
          <>
            {name} <span className="text-xs">{relation}</span>
          </>
        ) : data.tombstone ? (
          // A tombstoned sample's own page answers 404, so it is named, not linked.
          <span className="text-primary/80 flex flex-col items-center">
            {name} <span className="sr-only">{relation}</span>
          </span>
        ) : (
          <Link
            to="/samples/$igsn"
            params={{ igsn: data.igsn }}
            className="nodrag nopan text-primary flex flex-col items-center underline"
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
      role="img"
      aria-label={m.lineage_more_hint({ count: data.count })}
      title={m.lineage_more_hint({ count: data.count })}
      className="border-primary/20 text-primary/70 flex h-full items-center justify-center rounded border border-dashed px-3 text-sm"
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
    : { type: "sample" as const, data: node }),
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
  const rootId = nodes.find(
    (node) => node.kind === "sample" && node.generation === 0,
  )?.id;

  return (
    <ReactFlow<LineageNodeType>
      key={rootId}
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
