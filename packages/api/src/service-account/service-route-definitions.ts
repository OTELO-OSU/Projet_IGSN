import { createRoute } from "@hono/zod-openapi";
import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { coreFilterFields } from "@projet-igsn/domain/sample/core/core-list-samples-query";
import {
  coreSampleBodySchema,
  coreSampleSchema,
} from "@projet-igsn/domain/sample/core/core-sample-schema";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  pageSchema,
  pageSizeSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import {
  coreListSamplesResponseSchema,
  frozenServiceSampleSchema,
  invalidServiceSampleSchema,
  serviceErrorSchema,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import { z } from "zod";

export const SERVICE_API_KEY_SCHEME = {
  type: "http",
  scheme: "bearer",
  description:
    "Bearer token holding the api key of a service account. A missing key and an unknown key both answer 403, so the api tells no caller whether a key exists.",
} as const;

const SECURITY = [{ apiKey: [] }];

const TAGS = ["Samples"];

const json = <Schema extends z.ZodType>(
  schema: Schema,
  description: string,
) => ({
  description,
  content: { "application/json": { schema } },
});

const FORBIDDEN = json(
  serviceErrorSchema,
  "The api key is missing or unknown.",
);

const THROTTLED = json(
  serviceErrorSchema,
  "Too many requests came from this address.",
);

const FAILED = json(serviceErrorSchema, "The request failed.");

const INVALID_IGSN = json(
  serviceErrorSchema,
  "The IGSN in the path is not a valid IGSN.",
);

const NOT_FOUND = json(
  serviceErrorSchema,
  "No published sample carries this IGSN.",
);

const UNSUPPORTED_MEDIA_TYPE = json(
  serviceErrorSchema,
  "The request carries a body that is not application/json.",
);

const igsnParamSchema = z.object({
  igsn: igsnSchema.meta({
    description: "IGSN of the sample, with no doi.org or igsn: prefix.",
  }),
});

const coreSampleBody = {
  required: true,
  content: { "application/json": { schema: coreSampleBodySchema } },
};

export const listSamplesRoute = createRoute({
  method: "get",
  path: "/samples",
  tags: TAGS,
  summary: "List published samples",
  description:
    "Lists every published sample of the registry as IGSN Core records, ordered by IGSN. Pass editable=true to narrow the list to the samples the service account itself may update, and any other parameter to filter it, several of them narrowing the list together.",
  security: SECURITY,
  request: {
    query: z.object({
      page: pageSchema.meta({
        type: "integer",
        minimum: 1,
        default: 1,
        description: "Page to read, counted from 1.",
      }),
      perPage: pageSizeSchema(DEFAULT_PAGE_SIZE).meta({
        type: "integer",
        enum: [...PAGE_SIZES],
        default: DEFAULT_PAGE_SIZE,
        description: "Number of samples per page.",
      }),
      editable: z.stringbool().optional().catch(undefined).meta({
        type: "boolean",
        description:
          "Set to true to list only the samples the account's managed groups reach, so only those it may update; left out, every published sample is listed.",
      }),
      ...coreFilterFields(),
    }),
  },
  responses: {
    200: json(coreListSamplesResponseSchema, "One page of published samples."),
    403: FORBIDDEN,
    429: THROTTLED,
    500: FAILED,
  },
});

export const getSampleRoute = createRoute({
  method: "get",
  path: "/samples/{igsn}",
  tags: TAGS,
  summary: "Read one published sample",
  description:
    "Returns the published sample carrying this IGSN as an IGSN Core record, whatever the account's reach. A sample that is not published answers 404.",
  security: SECURITY,
  request: { params: igsnParamSchema },
  responses: {
    200: json(coreSampleSchema, "The published sample."),
    400: INVALID_IGSN,
    403: FORBIDDEN,
    404: NOT_FOUND,
    429: THROTTLED,
    500: FAILED,
  },
});

export const createSampleRoute = createRoute({
  method: "post",
  path: "/samples",
  tags: TAGS,
  summary: "Create and publish a sample",
  description:
    "Creates a sample from an IGSN Core record and publishes it at once, owned by the account's owner and snapshotting the account's own institutional codes. The record must satisfy every publication constraint, since a draft is never created.",
  security: SECURITY,
  request: { body: coreSampleBody },
  responses: {
    201: json(coreSampleSchema, "The sample as created and published."),
    403: FORBIDDEN,
    415: UNSUPPORTED_MEDIA_TYPE,
    422: json(
      invalidServiceSampleSchema,
      "The record cannot be published as it stands, one issue per reason.",
    ),
    429: THROTTLED,
    500: FAILED,
  },
});

export const updateSampleRoute = createRoute({
  method: "put",
  path: "/samples/{igsn}",
  tags: TAGS,
  summary: "Update a published sample",
  description:
    "Replaces the record of a published sample the account's managed groups reach. Publication freezes part of the record, and the parents of a sample are set at creation, so neither can be edited here.",
  security: SECURITY,
  request: { params: igsnParamSchema, body: coreSampleBody },
  responses: {
    200: json(coreSampleSchema, "The sample as updated."),
    400: INVALID_IGSN,
    403: json(
      z.union([frozenServiceSampleSchema, serviceErrorSchema]),
      "The record edits a field publication froze, one issue per field. The api key being missing or unknown, or the sample being out of the account's reach, answers the same status with the issue-less ServiceError body.",
    ),
    404: NOT_FOUND,
    415: UNSUPPORTED_MEDIA_TYPE,
    422: json(
      invalidServiceSampleSchema,
      "The record cannot stay published as it stands, one issue per reason.",
    ),
    429: THROTTLED,
    500: FAILED,
  },
});
