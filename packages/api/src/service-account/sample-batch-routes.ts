import type { OpenAPIHono } from "@hono/zod-openapi";
import type {
  BatchSuspectedDuplicate,
  SampleBatchConflict,
  SampleBatchItem,
} from "@projet-igsn/domain/sample-batch/model";
import type {
  SampleBatchItemWrite,
  SampleBatchRepository,
} from "@projet-igsn/domain/sample-batch/repository";
import type { DuplicateCriteria } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";
import type { ServiceSampleIssue } from "@projet-igsn/domain/service-account/service-sample-validator";

import { changedSampleFields } from "@projet-igsn/domain/sample/changed-sample-fields";
import {
  duplicateCheckCriteria,
  toDuplicateCriteria,
} from "@projet-igsn/domain/sample/publication/suspected-duplicate";

import {
  type ServiceEnv,
  keyedServiceAccount,
} from "../auth/require-service-account.ts";
import { checkDataCite } from "../datacite/check-datacite.ts";
import { dataCiteConfig } from "../datacite/config.ts";
import { webhookTarget } from "../sample-batch/public-host.ts";
import { PARENT_CYCLE } from "../sample/service/add-sample-parents.ts";
import { findCyclicParentLinks } from "../sample/service/find-cyclic-parent-links.ts";
import {
  catchChildNotEligible,
  ChildNotEligibleError,
} from "../sample/service/replace-sample-children.ts";
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
} from "./service-sample-checks.ts";
import { invalidSample, serviceSampleIssue } from "./service-sample-issue.ts";

type Deps = ServiceSampleChecksDeps & {
  samples: Pick<SampleRepository, "getEditLock" | "findBatchDuplicates">;
  sampleBatches: SampleBatchRepository;
};

type CheckedItem = {
  write: SampleBatchItemWrite;
  addedParentIds: readonly string[];
  duplicates: (
    confirmed: boolean | undefined,
  ) => Promise<BatchSuspectedDuplicate[]>;
  duplicateKey: string | null;
};

const suspectedDuplicates = async (
  samples: Deps["samples"],
  criteria: DuplicateCriteria | null,
  exclude?: string,
): Promise<BatchSuspectedDuplicate[]> =>
  criteria === null ? [] : samples.findBatchDuplicates(criteria, exclude);

const atItem = (index: number, issues: ServiceSampleIssue[]) =>
  issues.map((issue) => ({
    ...issue,
    path:
      issue.path === undefined
        ? `items.${index}.sample`
        : `items.${index}.sample.${issue.path}`,
  }));

const batchDuplicates = (checked: CheckedItem[], index: number) => {
  const key = checked[index]?.duplicateKey;
  return key == null
    ? []
    : checked.flatMap((other, at) =>
        at !== index && other.duplicateKey === key ? [at] : [],
      );
};

const withAttachableOnce = (
  manualGroups: Deps["manualGroups"],
): Deps["manualGroups"] => {
  let attachable:
    | ReturnType<Deps["manualGroups"]["listAttachableForUser"]>
    | undefined;
  return {
    listAttachableForUser: (ownerId) =>
      (attachable ??= manualGroups.listAttachableForUser(ownerId)),
  };
};

async function checkItem(
  deps: Deps,
  account: ServiceAccount,
  { partnerId, sample }: SampleBatchItem,
  isRepeated: boolean,
): Promise<Checked<CheckedItem>> {
  const igsn = sample.identification.sampleIdentifier;
  if (igsn === undefined) {
    const checked = await checkServiceCreate(deps, account, sample);
    if ("issues" in checked) return checked;
    const { input } = checked.value;
    const criteria = toDuplicateCriteria(input);
    return {
      value: {
        write: { partnerId, create: input },
        addedParentIds: [],
        duplicates: (confirmed) =>
          suspectedDuplicates(
            deps.samples,
            duplicateCheckCriteria(input, { confirmed }),
          ),
        duplicateKey: criteria === null ? null : JSON.stringify(criteria),
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
  const lock = await deps.samples.getEditLock(current.id);
  if (lock && lock.userId !== account.sampleOwner.id) {
    return { issues: [serviceSampleIssue("sample_locked", SAMPLE_KEY_PATH)] };
  }
  if (
    changedSampleFields(current, merged).length === 0 &&
    checked.value.parents.length === 0
  ) {
    return {
      value: {
        write: { partnerId, unchanged: { id: current.id } },
        addedParentIds: [],
        duplicates: async () => [],
        duplicateKey: null,
      },
    };
  }
  return {
    value: {
      write: {
        partnerId,
        update: { id: current.id, input: merged, updatedAt: current.updatedAt },
      },
      addedParentIds: checked.value.parents.map(({ id }) => id),
      duplicates: (confirmed) =>
        suspectedDuplicates(
          deps.samples,
          duplicateCheckCriteria(merged, { previous: current, confirmed }),
          current.id,
        ),
      duplicateKey: null,
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
      const { items, webhook } = c.req.valid("json");
      if (webhook && webhookTarget(webhook.url) === null) {
        return invalidSample(c, [
          serviceSampleIssue(
            "invalid_format",
            ["webhook", "url"],
            "The url must use https and a public host.",
          ),
        ]);
      }
      const keys = items.map(
        ({ sample }) => sample.identification.sampleIdentifier,
      );
      const issues: ServiceSampleIssue[] = [];
      const checked: CheckedItem[] = [];
      const batchDeps = {
        ...deps,
        manualGroups: withAttachableOnce(deps.manualGroups),
      };
      // ponytail: up to 500 items times a few queries each, run one by one; one batched lookup per kind (parents, reach, locks, duplicates) if batches get slow.
      for (const [index, item] of items.entries()) {
        const key = keys[index];
        const result = await checkItem(
          batchDeps,
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
        return invalidSample(c, issues);
      }
      const links = checked.flatMap(({ write, addedParentIds }, index) =>
        "update" in write && addedParentIds.length > 0
          ? [{ index, childId: write.update.id, parentIds: addedParentIds }]
          : [],
      );
      const cyclic = findCyclicParentLinks(
        links,
        await deps.samples.listDescendantIds(
          links.map(({ childId }) => childId),
        ),
      );
      if (cyclic.length > 0) {
        return invalidSample(
          c,
          cyclic.flatMap((at) =>
            atItem(links[at]!.index, [
              serviceSampleIssue("custom", ["relations"], PARENT_CYCLE),
            ]),
          ),
        );
      }
      const { confirmDuplicates } = c.req.valid("query");
      const conflicts: SampleBatchConflict["items"] = [];
      for (const [index, item] of checked.entries()) {
        const duplicates = await item.duplicates(confirmDuplicates);
        const inBatch =
          confirmDuplicates === true ? [] : batchDuplicates(checked, index);
        if (duplicates.length > 0 || inBatch.length > 0) {
          conflicts.push({ index, duplicates, batchDuplicates: inBatch });
        }
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
      const batch = await catchChildNotEligible(
        deps.sampleBatches.create({
          serviceAccountId: account.id,
          ownerId: account.sampleOwner.id,
          groups: account,
          items: checked.map(({ write }) => write),
          webhook,
        }),
      );
      if (batch instanceof ChildNotEligibleError) {
        return invalidSample(c, [serviceSampleIssue("child_not_eligible", [])]);
      }
      return c.json(batch, 202);
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
