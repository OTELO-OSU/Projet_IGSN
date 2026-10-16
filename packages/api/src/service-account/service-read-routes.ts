import type { OpenAPIHono } from "@hono/zod-openapi";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Context } from "hono";

import { toListSamplesQuery } from "@projet-igsn/domain/sample/core/core-list-samples-query";
import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { DATACITE_MEDIA_TYPE } from "@projet-igsn/domain/sample/datacite/datacite-schema";
import { toDataCiteSample } from "@projet-igsn/domain/sample/datacite/to-datacite-sample";
import { ISAMPLES_MEDIA_TYPE } from "@projet-igsn/domain/sample/isamples/isamples-schema";
import { toISamplesSample } from "@projet-igsn/domain/sample/isamples/to-isamples-sample";
import { OMS_MEDIA_TYPE } from "@projet-igsn/domain/sample/oms/oms-schema";
import {
  toOmsSample,
  toOmsSampleCollection,
} from "@projet-igsn/domain/sample/oms/to-oms-sample";
import { redactPrivateContacts } from "@projet-igsn/domain/sample/publication/redact-private-contacts";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { accepts } from "hono/accepts";

import type { ServiceEnv } from "../auth/require-service-account.ts";

import { findPublished } from "./resolve-service-relations.ts";
import {
  SERVED_MEDIA_TYPES,
  getSampleRoute,
  listSamplesRoute,
} from "./service-route-definitions.ts";

const specificity = (type: string) =>
  type === "*/*" ? 0 : type === "application/*" ? 1 : 2;

// ponytail: Accept: application/json;q=0 reads as unranked, not as explicitly unacceptable; write an RFC 9110 parser if a caller ever needs it
const negotiate = (c: Context<ServiceEnv>) =>
  accepts(c, {
    header: "Accept",
    supports: ["*/*", "application/*", ...SERVED_MEDIA_TYPES],
    default: "*/*",
    match: (candidates, { supports }) =>
      [...candidates]
        .sort((a, b) => b.q - a.q || specificity(b.type) - specificity(a.type))
        .find(({ type }) => supports.includes(type))?.type ?? "",
  });

export const NO_REACH: ModerationScope = {
  callerId: "",
  superAdmin: false,
  managedLaboratories: [],
  managedManualGroupIds: [],
};

const readable = (c: Context<ServiceEnv>, sample: Sample) =>
  c.get("serviceAccount") ? sample : redactPrivateContacts(sample);

const notAcceptable = (c: Context<ServiceEnv>) =>
  c.json({ error: "Not acceptable" }, 406);

export function registerServiceReadRoutes(
  app: OpenAPIHono<ServiceEnv>,
  samples: SampleRepository,
  frontendUrl: string,
): void {
  app
    .openapi(listSamplesRoute, async (c) => {
      const format = negotiate(c);
      if (!format) {
        return notAcceptable(c);
      }
      const account = c.get("serviceAccount");
      const { editable, ...query } = c.req.valid("query");
      const { data, total } = await samples.listPublishedForService(
        { ...toListSamplesQuery(query), sort: "igsn" },
        account ? managerScope(account.id, account.managedGroups) : NO_REACH,
        account !== undefined && editable === true,
      );
      const records = data.map((sample) =>
        toCoreSample(readable(c, sample), frontendUrl),
      );
      const meta = { total };
      switch (format) {
        case DATACITE_MEDIA_TYPE:
          return c.json(
            { data: records.map((record) => toDataCiteSample(record)), meta },
            200,
            {
              "content-type": format,
            },
          );
        case ISAMPLES_MEDIA_TYPE:
          return c.json({ data: records.map(toISamplesSample), meta }, 200, {
            "content-type": format,
          });
        case OMS_MEDIA_TYPE:
          return c.json(toOmsSampleCollection(records, total), 200, {
            "content-type": format,
          });
        default:
          return c.json({ data: records, meta }, 200);
      }
    })
    .openapi(getSampleRoute, async (c) => {
      const format = negotiate(c);
      if (!format) {
        return notAcceptable(c);
      }
      const sample = await findPublished(samples, c.req.valid("param").igsn);
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      const core = toCoreSample(readable(c, sample), frontendUrl);
      switch (format) {
        case DATACITE_MEDIA_TYPE:
          return c.json(toDataCiteSample(core), 200, {
            "content-type": format,
          });
        case ISAMPLES_MEDIA_TYPE:
          return c.json(toISamplesSample(core), 200, {
            "content-type": format,
          });
        case OMS_MEDIA_TYPE:
          return c.json(toOmsSample(core), 200, {
            "content-type": format,
          });
        default:
          return c.json(core, 200);
      }
    });
}
