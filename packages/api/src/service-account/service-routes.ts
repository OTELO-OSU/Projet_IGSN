import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type {
  FrozenServiceSample,
  InvalidServiceSample,
  ServiceSampleIssue,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { Context } from "hono";

import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { changedSampleFields } from "@projet-igsn/domain/sample/changed-sample-fields";
import { keepContactLinks } from "@projet-igsn/domain/sample/contact-link";
import { toListSamplesQuery } from "@projet-igsn/domain/sample/core/core-list-samples-query";
import { CORE_SCHEMA_VERSION } from "@projet-igsn/domain/sample/core/core-sample-schema";
import { fromCoreSample } from "@projet-igsn/domain/sample/core/from-core-sample";
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
import { frozenFieldEdits } from "@projet-igsn/domain/sample/publication/frozen-field-edits";
import { newPublishBlockers } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import {
  createSampleSchema,
  updateSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { accepts } from "hono/accepts";

import type { SendMail } from "../mail/send-mail.ts";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";
import { notifySampleModerated } from "../sample/notify-sample-moderated.ts";
import { notifySubSampleDeclared } from "../sample/notify-sub-sample-declared.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import {
  type ResolvedParent,
  createServiceSampleIssues,
  processStepsOnRootIssue,
} from "./create-service-sample-issues.ts";
import {
  SERVED_MEDIA_TYPES,
  SERVICE_API_KEY_SCHEME,
  createSampleRoute,
  getSampleRoute,
  listSamplesRoute,
  updateSampleRoute,
} from "./service-route-definitions.ts";
import {
  frozenFieldIssues,
  publishBlockerIssues,
  serviceSampleIssue,
  zodIssues,
} from "./service-sample-issue.ts";
import { serviceValidationHook } from "./service-validation-hook.ts";

const SWAGGER_UI_VERSION = "5.32.15";

const OPENAPI_URL = "./openapi.json";

const SWAGGER_UI_INTEGRITY: Record<string, string> = {
  "swagger-ui-bundle.js":
    "sha384-m7zaGj7MPzU+G4lz2eyy73GxK9bbRDr9bB2CSdj8wodg2wu/Wnt6wsoLP3JD+RS9",
  "swagger-ui.css":
    "sha384-fgyWYkUAamzuI8mJFu/xpRP0JWCJRwkwUwsYDoOYVHUJ8NQE5cENn8ib3ppwFFSX",
};

const subresource = (url: string) =>
  `integrity="${SWAGGER_UI_INTEGRITY[url.slice(url.lastIndexOf("/") + 1)]}" crossorigin="anonymous"`;

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

const notAcceptable = (c: Context<ServiceEnv>) =>
  c.json({ error: "Not acceptable" }, 406);

const invalid = (c: Context<ServiceEnv>, issues: ServiceSampleIssue[]) =>
  c.json(
    { error: "Invalid sample", issues } satisfies InvalidServiceSample,
    422,
  );

const forbidden = (c: Context<ServiceEnv>, issues: ServiceSampleIssue[]) =>
  c.json({ error: "Forbidden", issues } satisfies FrozenServiceSample, 403);

export function createServiceRoutes(
  serviceAccounts: Pick<ServiceAccountRepository, "findByApiKeyHash">,
  samples: SampleRepository,
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">,
  frontendUrl: string,
  userSamples: Pick<UserSampleRepository, "listCollaborators">,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  const findPublished = async (igsn: string) => {
    const sample = await samples.getPublicByIgsn(igsn);
    return sample?.status === "published" ? sample : null;
  };
  const findPublishedByIgsn = async (igsn: string) => {
    const parsed = igsnSchema.safeParse(igsn);
    return parsed.success ? findPublished(parsed.data) : null;
  };
  const app = new OpenAPIHono<ServiceEnv>({
    defaultHook: serviceValidationHook,
  });
  app.openAPIRegistry.registerComponent(
    "securitySchemes",
    "apiKey",
    SERVICE_API_KEY_SCHEME,
  );
  let document: string | undefined;
  app.get("/openapi.json", (c) =>
    c.body(
      (document ??= JSON.stringify(
        app.getOpenAPI31Document({
          openapi: "3.1.0",
          info: {
            title: "IGSN service API",
            version: CORE_SCHEMA_VERSION,
            description:
              "Machine API of the IGSN registry, reading and writing published samples as IGSN Core v0.10.0 records. A service account authenticates every call with its api key.",
          },
          servers: [{ url: new URL("api/service", frontendUrl).toString() }],
        }),
      )),
      200,
      { "content-type": "application/json" },
    ),
  );
  app.get(
    "/docs",
    swaggerUI({
      url: OPENAPI_URL,
      version: SWAGGER_UI_VERSION,
      manuallySwaggerUIHtml: ({ css, js }) => `
        <div id="swagger-ui"></div>
        ${css.map((url) => `<link rel="stylesheet" href="${url}" ${subresource(url)} />`).join("")}
        ${js.map((url) => `<script src="${url}" ${subresource(url)}></script>`).join("")}
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({ dom_id: '#swagger-ui', url: '${OPENAPI_URL}' })
          }
        </script>
      `,
    }),
  );
  app.use("*", requireServiceAccount(serviceAccounts));
  return app
    .openapi(listSamplesRoute, async (c) => {
      const format = negotiate(c);
      if (!format) {
        return notAcceptable(c);
      }
      const account = c.get("serviceAccount");
      const { editable, ...query } = c.req.valid("query");
      const { data, total } = await samples.listPublishedForService(
        { ...toListSamplesQuery(query), sort: "igsn" },
        managerScope(account.id, account.managedGroups),
        editable === true,
      );
      const records = data.map((sample) => toCoreSample(sample, frontendUrl));
      const meta = { total };
      switch (format) {
        case DATACITE_MEDIA_TYPE:
          return c.json({ data: records.map(toDataCiteSample), meta }, 200, {
            "content-type": format,
          });
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
      const sample = await findPublished(c.req.valid("param").igsn);
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      const core = toCoreSample(sample, frontendUrl);
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
    })
    .openapi(createSampleRoute, async (c) => {
      const account = c.get("serviceAccount");
      const { sample, parents } = fromCoreSample(c.req.valid("json"));
      const resolved: ResolvedParent[] = await Promise.all(
        parents.map(async ({ igsn, relationIndex }) => ({
          relationIndex,
          sample: await findPublishedByIgsn(igsn),
        })),
      );
      const parsed = createSampleSchema.safeParse({
        ...sample,
        parentIds: resolved
          .map(({ sample: parent }) => parent?.id)
          .filter((id) => id != null),
      });
      if (!parsed.success) {
        return invalid(c, zodIssues(parsed.error));
      }
      const issues = await createServiceSampleIssues(
        { manualGroups },
        account.owner.id,
        parsed.data,
        resolved,
      );
      if (issues.length > 0) {
        return invalid(c, issues);
      }
      const created = await samples.createPublished(
        parsed.data,
        account.owner.id,
        account,
      );
      notifySubSampleDeclared({
        userSamples,
        mail,
        declarer: account.owner,
        subSample: created,
        parents: resolved
          .map(({ sample: parent }) => parent)
          .filter((parent) => parent !== null),
      });
      return c.json(toCoreSample(created, frontendUrl), 201);
    })
    .openapi(updateSampleRoute, async (c) => {
      const account = c.get("serviceAccount");
      const current = await findPublished(c.req.valid("param").igsn);
      if (!current) {
        return c.json({ error: "Not found" }, 404);
      }
      if (
        !(await samples.isModerated(
          current.id,
          managerScope(account.id, account.managedGroups),
        ))
      ) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const { sample, parents } = fromCoreSample(c.req.valid("json"));
      const stored = new Set(current.parents.map(({ igsn }) => igsn));
      const changed = parents.findIndex(
        ({ igsn }) => !stored.has(igsnSchema.parse(igsn)),
      );
      if (changed !== -1 || parents.length !== stored.size) {
        return forbidden(c, [
          serviceSampleIssue("field_frozen", [
            "relations",
            parents[changed]?.relationIndex ?? 0,
          ]),
        ]);
      }
      const parsed = updateSampleSchema.safeParse(
        keepContactLinks(sample, current),
      );
      if (!parsed.success) {
        return invalid(c, zodIssues(parsed.error));
      }
      const merged = mergePublishedEdit(current, parsed.data);
      const frozen = frozenFieldEdits(parsed.data, merged);
      if (frozen.length > 0) {
        return forbidden(c, frozenFieldIssues(frozen));
      }
      const blockers = newPublishBlockers(current, merged, uploadLimit);
      if (blockers.length > 0) {
        return invalid(c, publishBlockerIssues(blockers));
      }
      if (
        (merged.processSteps?.length ?? 0) > 0 &&
        current.parents.length === 0
      ) {
        return invalid(c, [processStepsOnRootIssue()]);
      }
      const updated = await samples.update(current.id, merged);
      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }
      const fields = changedSampleFields(current, merged);
      if (mail && fields.length > 0) {
        // ponytail: fire and forget; a retry queue if a lost notification ever matters.
        void notifySampleModerated({
          userSamples,
          mail,
          sample: updated,
          fields,
          actorId: account.owner.id,
        });
      }
      return c.json(toCoreSample(updated, frontendUrl), 200);
    });
}
