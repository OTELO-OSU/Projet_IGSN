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

const hasNoCredentials = (url: string): boolean => {
  const parsed = URL.parse(url);
  return parsed?.username === "" && parsed.password === "";
};

export const sampleBatchWebhookSchema = z
  .strictObject({
    url: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .refine(hasNoCredentials, "The url must not carry credentials.")
      .meta({
        description:
          "The https url of a public host, without credentials, receiving one POST { batchId, partnerId, id, status, igsn, publishingError } per sample each time its publication succeeds or fails, with X-Webhook-Id (the same across retries) and X-Webhook-Timestamp (unix seconds) headers. An unchanged item is not queued, so it is never called. A call answered with anything but 2xx is retried with growing delays over about 21 hours, then dropped.",
      }),
    secret: z.string().min(16).max(255).meta({
      description:
        'Each call carries X-Signature: sha256=<hex HMAC-SHA256 of "<X-Webhook-Timestamp>.<body>"> keyed with it.',
    }),
  })
  .meta({
    id: "SampleBatchWebhook",
    description:
      "The url called once per sample each time its publication succeeds or fails, signed with the secret.",
  });

export type SampleBatchWebhook = z.infer<typeof sampleBatchWebhookSchema>;

export const sampleBatchBodySchema = z
  .strictObject({
    items: z
      .array(sampleBatchItemSchema)
      .min(1)
      .max(MAX_IMPORT_ROWS)
      .meta({
        description: `Between 1 and ${MAX_IMPORT_ROWS} samples, accepted or refused as a whole. An item whose identification.sampleIdentifier is present updates that published sample, and an item without it creates a new sample.`,
      }),
    webhook: sampleBatchWebhookSchema.optional(),
  })
  .meta({
    id: "SampleBatchBody",
    description:
      "The samples of a batch and the optional webhook told of each publication.",
  });

export type SampleBatchBody = z.infer<typeof sampleBatchBodySchema>;

export const batchSuspectedDuplicateSchema = suspectedDuplicateSchema
  .extend({
    id: z.uuid().meta({
      description: "Internal identifier of the duplicated sample.",
    }),
    igsn: igsnSchema.nullable().meta({
      description:
        "IGSN of the duplicated sample, with no doi.org or igsn: prefix, null while it is still publishing.",
    }),
    name: z.string().meta({
      description: "Name the duplicated sample carries.",
    }),
  })
  .meta({
    id: "SampleBatchSuspectedDuplicate",
    description:
      "A published or publishing sample carrying the same name, material and collector as the item.",
  });

export type BatchSuspectedDuplicate = z.infer<
  typeof batchSuspectedDuplicateSchema
>;

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
            duplicates: z.array(batchSuspectedDuplicateSchema).meta({
              description:
                "The published or publishing samples the item is suspected to duplicate.",
            }),
            batchDuplicates: z.array(z.number().int().nonnegative()).meta({
              description:
                "Positions of the other items of this batch carrying the same name, material and collector.",
            }),
          })
          .meta({
            description:
              "One item suspected to duplicate a sample or other items.",
          }),
      )
      .meta({
        description:
          "Every item suspected to duplicate a sample or other items.",
      }),
  })
  .meta({
    id: "SampleBatchConflict",
    description:
      "Body returned when items are suspected to duplicate published or publishing samples, or each other.",
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
