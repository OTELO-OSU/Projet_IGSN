import { z } from "zod";

import type { PublishBlocker } from "../sample/publication/sample-publish-blockers.ts";

import { coreSampleSchema } from "../sample/core/core-sample-schema.ts";

export const coreListSamplesResponseSchema = z
  .object({
    data: z.array(coreSampleSchema).meta({
      description:
        "Published samples the account can read, one IGSN Core record each.",
    }),
    meta: z
      .object({
        total: z.number().int().nonnegative().meta({
          description:
            "Number of samples matching the query, every page taken together.",
        }),
      })
      .meta({ description: "Counters describing the whole result set." }),
  })
  .meta({
    id: "CoreSampleList",
    description: "One page of IGSN Core sample records.",
  });

export type CoreListSamplesResponse = z.infer<
  typeof coreListSamplesResponseSchema
>;

export type ServiceSampleIssueCode =
  | PublishBlocker
  | "location_inherited_from_parent"
  | "manual_group_not_attachable"
  | "field_frozen";

const serviceSampleIssueSchema = z.object({
  path: z
    .string()
    .meta({
      description:
        "IGSN Core path of the field at fault, absent when the issue is about the sample as a whole.",
    })
    .optional(),
  code: z.string().meta({
    description:
      "Machine-readable reason, a publish blocker code or one of location_inherited_from_parent, manual_group_not_attachable and field_frozen.",
  }),
  message: z
    .string()
    .meta({ description: "Human-readable explanation of that reason." })
    .optional(),
});

export type ServiceSampleIssue = z.infer<typeof serviceSampleIssueSchema>;

export const invalidServiceSampleSchema = z
  .object({
    error: z
      .literal("Invalid sample")
      .meta({ description: "Constant label of this error." }),
    issues: z.array(serviceSampleIssueSchema).meta({
      description: "One entry per reason the sample was refused.",
    }),
  })
  .meta({
    id: "InvalidSample",
    description:
      "Body returned when the submitted sample cannot be published as it stands.",
  });

export type InvalidServiceSample = z.infer<typeof invalidServiceSampleSchema>;

export const frozenServiceSampleSchema = invalidServiceSampleSchema
  .extend({
    error: z
      .literal("Forbidden")
      .meta({ description: "Constant label of this error." }),
  })
  .meta({
    id: "FrozenSample",
    description:
      "Body returned when the request edits a field publication froze.",
  });

export type FrozenServiceSample = z.infer<typeof frozenServiceSampleSchema>;

export const serviceErrorSchema = z
  .strictObject({
    error: z.string().meta({
      description: "Human-readable reason the request was refused.",
    }),
  })
  .meta({
    id: "ServiceError",
    description:
      "Body returned when the request is malformed, unauthorized, unknown, throttled or failed.",
  });

export type ServiceError = z.infer<typeof serviceErrorSchema>;
