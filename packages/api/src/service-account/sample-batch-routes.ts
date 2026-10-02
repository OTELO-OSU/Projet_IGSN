import type { OpenAPIHono } from "@hono/zod-openapi";
import type {
  AcceptedSampleBatch,
  SampleBatchConflict,
  SampleBatchItem,
} from "@projet-igsn/domain/sample-batch/model";
import type {
  SampleBatchItemWrite,
  SampleBatchRepository,
} from "@projet-igsn/domain/sample-batch/repository";
import type { SuspectedDuplicate } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";
import type {
  InvalidServiceSample,
  ServiceSampleIssue,
} from "@projet-igsn/domain/service-account/service-sample-validator";

import {
  type ServiceEnv,
  keyedServiceAccount,
} from "../auth/require-service-account.ts";
import { checkDataCite } from "../datacite/check-datacite.ts";
import { dataCiteConfig } from "../datacite/config.ts";
import {
  createSampleBatchRoute,
  getSampleBatchRoute,
} from "./service-route-definitions.ts";
import {
  type Checked,
  type ServiceSampleChecksDeps,
  SAMPLE_KEY_PATH,
  checkServiceCreate,
  checkServiceUpdate,
  createDuplicates,
  updateDuplicates,
} from "./service-sample-checks.ts";
import { serviceSampleIssue } from "./service-sample-issue.ts";

type Deps = ServiceSampleChecksDeps & { sampleBatches: SampleBatchRepository };

type CheckedItem = {
  write: SampleBatchItemWrite;
  duplicates: (confirmed: boolean | undefined) => Promise<SuspectedDuplicate[]>;
};

const atItem = (index: number, issues: ServiceSampleIssue[]) =>
  issues.map((issue) => ({
    ...issue,
    path: issue.path === undefined ? `${index}` : `${index}.${issue.path}`,
  }));

async function checkItem(
  deps: Deps,
  account: ServiceAccount,
  { partnerId, sample }: SampleBatchItem,
  isRepeated: boolean,
): Promise<Checked<CheckedItem>> {
  const igsn = sample.identification.sampleIdentifier;
  if (igsn === undefined) {
    const checked = await checkServiceCreate(deps, account.owner.id, sample);
    if ("issues" in checked) return checked;
    return {
      value: {
        write: { partnerId, create: checked.value.input },
        duplicates: (confirmed) =>
          createDuplicates(deps.samples, checked.value, confirmed),
      },
    };
  }
  if (isRepeated) {
    return {
      issues: [serviceSampleIssue("duplicate_sample_key", SAMPLE_KEY_PATH)],
    };
  }
  const checked = await checkServiceUpdate(deps, account, igsn, sample);
  if ("issues" in checked) return checked;
  const { current, merged } = checked.value;
  return {
    value: {
      write: { partnerId, update: { id: current.id, input: merged } },
      duplicates: (confirmed) =>
        updateDuplicates(deps.samples, checked.value, confirmed),
    },
  };
}

export function registerSampleBatchRoutes(
  app: OpenAPIHono<ServiceEnv>,
  deps: Deps,
): void {
  app
    .openapi(createSampleBatchRoute, async (c) => {
      const account = keyedServiceAccount(c);
      const items = c.req.valid("json");
      const keys = items.map(
        ({ sample }) => sample.identification.sampleIdentifier,
      );
      const issues: ServiceSampleIssue[] = [];
      const checked: CheckedItem[] = [];
      for (const [index, item] of items.entries()) {
        const key = keys[index];
        const result = await checkItem(
          deps,
          account,
          item,
          key !== undefined && keys.indexOf(key) < index,
        );
        if ("issues" in result) {
          issues.push(...atItem(index, result.issues));
        } else {
          checked.push(result.value);
        }
      }
      if (issues.length > 0) {
        return c.json(
          { error: "Invalid sample", issues } satisfies InvalidServiceSample,
          422,
        );
      }
      const { confirmDuplicates } = c.req.valid("query");
      const conflicts: SampleBatchConflict["items"] = [];
      for (const [index, item] of checked.entries()) {
        const duplicates = await item.duplicates(confirmDuplicates);
        if (duplicates.length > 0) conflicts.push({ index, duplicates });
      }
      if (conflicts.length > 0) {
        return c.json(
          {
            error: "Suspected duplicate",
            reason: "duplicates",
            items: conflicts,
          } satisfies SampleBatchConflict,
          409,
        );
      }
      if (!(await checkDataCite(dataCiteConfig()))) {
        return c.json({ error: "DataCite unavailable" }, 503);
      }
      const id = await deps.sampleBatches.create({
        serviceAccountId: account.id,
        ownerId: account.owner.id,
        groups: account,
        items: checked.map(({ write }) => write),
      });
      return c.json({ id } satisfies AcceptedSampleBatch, 202);
    })
    .openapi(
      getSampleBatchRoute,
      async (c) => {
        const account = keyedServiceAccount(c);
        const batch = await deps.sampleBatches.get(
          c.req.valid("param").id,
          account.id,
        );
        if (!batch) {
          return c.json({ error: "Not found" }, 404);
        }
        return c.json(batch, 200);
      },
      (result, c) =>
        result.success ? undefined : c.json({ error: "Invalid batch id" }, 400),
    );
}
