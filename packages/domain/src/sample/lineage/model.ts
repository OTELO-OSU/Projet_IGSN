import { z } from "zod";

import { sampleParentSchema } from "../parent/model.ts";

export const sampleLineageNodeSchema = sampleParentSchema.extend({
  /** Negative for ancestors, 0 for the requested sample, positive for descendants. */
  generation: z.number().int(),
  /** A tombstoned sample is named in the graph, but its own page answers 404. */
  tombstone: z.boolean(),
});

export type SampleLineageNode = z.infer<typeof sampleLineageNodeSchema>;

export const sampleLineageSchema = z.object({
  nodes: z.array(sampleLineageNodeSchema),
  edges: z.array(z.object({ parentId: z.uuid(), childId: z.uuid() })),
  truncated: z.boolean(),
});

export type SampleLineage = z.infer<typeof sampleLineageSchema>;
