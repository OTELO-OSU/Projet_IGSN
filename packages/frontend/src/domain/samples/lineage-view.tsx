import type {
  SampleLineage,
  SampleLineageNode,
} from "@projet-igsn/domain/sample/lineage/model";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { Maximize2Icon } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";

import type { LineageGraphNode } from "#/domain/samples/lineage-graph.tsx";

import { LineageLinks } from "#/domain/samples/lineage-links.tsx";
import { trimLineage } from "#/domain/samples/trim-lineage.ts";
import { m } from "#/paraglide/messages.js";

const LineageGraph = lazy(() =>
  import("#/domain/samples/lineage-graph.tsx").then((module) => ({
    default: module.LineageGraph,
  })),
);

const COMPACT_LIMITS = { maxGenerations: 2, maxPerLevel: 4 };

const toGraphNode = (node: SampleLineageNode): LineageGraphNode => ({
  kind: "sample",
  ...node,
});

export function LineageView({ lineage }: { lineage: SampleLineage }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const compact = trimLineage(lineage, COMPACT_LIMITS);
  const compactNodes: LineageGraphNode[] = [
    ...compact.nodes.map(toGraphNode),
    ...Object.entries(compact.dropped).map(([generation, count]) => ({
      kind: "more" as const,
      id: `more-${generation}`,
      generation: Number(generation),
      count,
    })),
  ];

  return (
    <div
      role="group"
      aria-label={m.lineage_graph_label()}
      className="relative mt-2 h-96 rounded border bg-sky-50/40"
    >
      <div className="absolute inset-0">
        {mounted ? (
          <Suspense fallback={null}>
            <LineageGraph nodes={compactNodes} edges={compact.edges} />
          </Suspense>
        ) : (
          // The graph needs the client, so the lineage ships as links too.
          <LineageLinks nodes={lineage.nodes} />
        )}
      </div>
      <TooltipProvider>
        <Dialog>
          <div className="absolute end-2 top-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={m.lineage_expand()}
                  >
                    <Maximize2Icon aria-hidden="true" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>{m.lineage_expand()}</TooltipContent>
            </Tooltip>
          </div>
          <DialogContent
            closeLabel={m.action_close()}
            className="h-[90vh] w-[95vw] max-w-none grid-rows-[auto_1fr] overflow-hidden sm:max-w-none"
          >
            <DialogHeader>
              <DialogTitle>{m.lineage_dialog_title()}</DialogTitle>
            </DialogHeader>
            <div className="h-full">
              <Suspense fallback={null}>
                <LineageGraph
                  nodes={lineage.nodes.map(toGraphNode)}
                  edges={lineage.edges}
                  zoomable
                />
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
}
