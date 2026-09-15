import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type {
  CoreListSamplesResponse,
  FrozenServiceSample,
  InvalidServiceSample,
  ServiceSampleIssue,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { Context } from "hono";

import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { fromCoreSample } from "@projet-igsn/domain/sample/core/from-core-sample";
import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { frozenFieldEdits } from "@projet-igsn/domain/sample/publication/frozen-field-edits";
import { newPublishBlockers } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import {
  createSampleSchema,
  updateSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { Hono } from "hono";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import { validateIgsnParam } from "../sample/validator.ts";
import {
  type ResolvedParent,
  createServiceSampleIssues,
} from "./create-service-sample-issues.ts";
import {
  frozenFieldIssues,
  publishBlockerIssues,
  serviceSampleIssue,
  zodIssues,
} from "./service-sample-issue.ts";
import {
  validateCoreSampleBody,
  validateListServiceSamplesQuery,
} from "./validator.ts";

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
) {
  const findPublished = async (igsn: string) => {
    const sample = await samples.getPublicByIgsn(igsn);
    return sample?.status === "published" ? sample : null;
  };
  const findPublishedByIgsn = async (igsn: string) => {
    const parsed = igsnSchema.safeParse(igsn);
    return parsed.success ? findPublished(parsed.data) : null;
  };
  return new Hono<ServiceEnv>()
    .use("*", requireServiceAccount(serviceAccounts))
    .get("/samples", validateListServiceSamplesQuery, async (c) => {
      const account = c.get("serviceAccount");
      const { editable, ...query } = c.req.valid("query");
      const { data, total } = await samples.listPublishedForService(
        { ...query, sort: "igsn" },
        managerScope(account.id, account.managedGroups),
        editable === true,
      );
      const body: CoreListSamplesResponse = {
        data: data.map((sample) => toCoreSample(sample, frontendUrl)),
        meta: { total },
      };
      return c.json(body);
    })
    .get("/samples/:igsn", validateIgsnParam, async (c) => {
      const sample = await findPublished(c.req.valid("param").igsn);
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      return c.json(toCoreSample(sample, frontendUrl));
    })
    .post("/samples", validateCoreSampleBody, async (c) => {
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
      return c.json(
        toCoreSample(
          {
            ...created,
            owner: {
              name: account.owner.name,
              firstname: account.owner.firstname,
            },
          },
          frontendUrl,
        ),
        201,
      );
    })
    .put(
      "/samples/:igsn",
      validateIgsnParam,
      validateCoreSampleBody,
      async (c) => {
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
        const parsed = updateSampleSchema.safeParse(sample);
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
        const updated = await samples.update(current.id, merged);
        if (!updated) {
          return c.json({ error: "Not found" }, 404);
        }
        return c.json(
          toCoreSample({ ...updated, owner: current.owner }, frontendUrl),
        );
      },
    );
}
