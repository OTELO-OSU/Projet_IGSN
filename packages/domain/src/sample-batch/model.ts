import { z } from "zod";

import { igsnSchema } from "../igsn/model.ts";
import { coreSampleBodySchema } from "../sample/core/core-sample-schema.ts";
import { MAX_IMPORT_ROWS } from "../sample/import/max-import-rows.ts";
import { suspectedDuplicateSchema } from "../sample/publication/suspected-duplicate.ts";
import { sampleStatusSchema } from "../sample/sample.ts";

const partnerIdSchema = z.string().trim().min(1).max(255).meta({
  description:
    "The partner's own key for this item, echoed back to match results, not required to be unique.",
});

export const sampleBatchItemSchema = z
  .strictObject({
    partnerId: partnerIdSchema,
    sample: coreSampleBodySchema,
  })
  .meta({
    id: "SampleBatchItem",
    description: "One sample of a batch, tagged with the partner's own key.",
  });

export type SampleBatchItem = z.infer<typeof sampleBatchItemSchema>;

export const sampleBatchBodySchema = z
  .array(sampleBatchItemSchema)
  .min(1)
  .max(MAX_IMPORT_ROWS)
  .meta({
    id: "SampleBatchBody",
    description: `Between 1 and ${MAX_IMPORT_ROWS} samples, accepted or refused as a whole. An item whose identification.sampleIdentifier is present updates that published sample, and an item without it creates a new sample.`,
  });

export type SampleBatchBody = z.infer<typeof sampleBatchBodySchema>;

export const acceptedSampleBatchSchema = z
  .object({
    id: z.uuid().meta({ description: "Identifier of the accepted batch." }),
  })
  .meta({
    id: "AcceptedSampleBatch",
    description: "Body returned when the batch is queued for publication.",
  });

export type AcceptedSampleBatch = z.infer<typeof acceptedSampleBatchSchema>;

export const sampleBatchConflictSchema = z
  .object({
    error: z.string().meta({
      description: "Human readable summary of the conflict.",
    }),
    reason: z.literal("duplicates").meta({
      description: "Always duplicates, naming the conflict the api found.",
    }),
    items: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative().meta({
              description: "Position of the item in the request array.",
            }),
            duplicates: z.array(suspectedDuplicateSchema).meta({
              description:
                "The published samples the item is suspected to duplicate.",
            }),
          })
          .meta({ description: "One item suspected to duplicate a sample." }),
      )
      .meta({ description: "Every item suspected to duplicate a sample." }),
  })
  .meta({
    id: "SampleBatchConflict",
    description:
      "Body returned when items are suspected to duplicate published samples.",
  });

export type SampleBatchConflict = z.infer<typeof sampleBatchConflictSchema>;

export const sampleBatchSchema = z
  .object({
    id: z.uuid().meta({ description: "Identifier of the batch." }),
    items: z
      .array(
        z
          .object({
            partnerId: partnerIdSchema,
            id: z.uuid().meta({ description: "Identifier of the sample." }),
            status: sampleStatusSchema.meta({
              description: "Current publication status of the sample.",
            }),
            igsn: igsnSchema.nullable().meta({
              description: "IGSN of the sample, null until it is published.",
            }),
            publishingError: z.string().nullable().meta({
              description:
                "Why the last publication attempt failed, null otherwise.",
            }),
          })
          .meta({ description: "One sample of the batch." }),
      )
      .meta({ description: "The batch's samples, in request order." }),
  })
  .meta({
    id: "SampleBatch",
    description: "A batch and the publication state of each of its samples.",
  });

export type SampleBatch = z.infer<typeof sampleBatchSchema>;
