import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { CoreSampleBody } from "@projet-igsn/domain/sample/core/core-sample-schema";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";
import type { ServiceSampleIssue } from "@projet-igsn/domain/service-account/service-sample-validator";

import { fromCoreSample } from "@projet-igsn/domain/sample/core/from-core-sample";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";

import {
  childIssues,
  createServiceSampleIssues,
  refusedSeriesIssues,
} from "./create-service-sample-issues.ts";
import {
  accountChildCandidates,
  listDeclarableParents,
  resolvedIds,
  resolveRelated,
} from "./resolve-service-relations.ts";
import { zodIssues } from "./service-sample-issue.ts";

export type ServiceSampleChecksDeps = {
  samples: Pick<
    SampleRepository,
    | "listPublishedByIgsns"
    | "listPublicSeriesLinkCandidatesByIgsns"
    | "isModerated"
    | "findDuplicates"
    | "listDescendantIds"
  >;
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">;
};

export type Checked<T> = { value: T } | { issues: ServiceSampleIssue[] };

export type CheckedCreate = { input: CreateSample; parents: Sample[] };

export const SAMPLE_KEY_PATH = ["identification", "sampleIdentifier"];

const refused = (...issues: ServiceSampleIssue[]) => ({ issues });

export async function checkServiceCreate(
  { samples, manualGroups }: ServiceSampleChecksDeps,
  account: ServiceAccount,
  body: CoreSampleBody,
): Promise<Checked<CheckedCreate>> {
  const { sample, parents, children, series } = fromCoreSample(body);
  const [resolved, resolvedChildren] = await Promise.all([
    resolveRelated(listDeclarableParents(samples), parents),
    resolveRelated(accountChildCandidates(samples, account), children),
  ]);
  const parsed = createSampleSchema.safeParse({
    ...sample,
    parentIds: resolvedIds(resolved),
    childIds: resolvedIds(resolvedChildren),
  });
  if (!parsed.success) {
    return refused(...zodIssues(parsed.error));
  }
  const issues = [
    ...childIssues(resolvedChildren),
    ...refusedSeriesIssues(series),
    ...(await createServiceSampleIssues(
      { manualGroups },
      account.sampleOwner.id,
      parsed.data,
      resolved,
    )),
  ];
  if (issues.length > 0) {
    return refused(...issues);
  }
  return {
    value: {
      input: parsed.data,
      parents: resolved
        .map(({ sample: parent }) => parent)
        .filter((parent) => parent !== null),
    },
  };
}
