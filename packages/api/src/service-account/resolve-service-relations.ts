import type { Igsn } from "@projet-igsn/domain/igsn/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";

import { igsnSchema } from "@projet-igsn/domain/igsn/model";
import { canDeclareSubSample } from "@projet-igsn/domain/user-sample/can-declare-sub-sample";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";

import type {
  ResolvedParent,
  ResolvedRelated,
} from "./create-service-sample-issues.ts";
import type { ServiceSampleChecksDeps } from "./service-sample-checks.ts";

export const findPublished = async (
  samples: ServiceSampleChecksDeps["samples"],
  igsn: Igsn,
): Promise<Sample | null> =>
  (await samples.listPublishedByIgsns([igsn])).get(igsn) ?? null;

export const resolveRelated = async <T>(
  listByIgsns: (igsns: string[]) => Promise<ReadonlyMap<string, T>>,
  related: readonly { igsn: string; relationIndex: number }[],
): Promise<ResolvedRelated<T>[]> => {
  const igsns = related.map(({ igsn }) => igsnSchema.safeParse(igsn).data);
  const found = await listByIgsns(igsns.filter((igsn) => igsn !== undefined));
  return related.map(({ relationIndex }, index) => ({
    relationIndex,
    sample: found.get(igsns[index] ?? "") ?? null,
  }));
};

export const listDeclarableParents =
  (samples: ServiceSampleChecksDeps["samples"]) =>
  async (igsns: string[]): Promise<ReadonlyMap<string, Sample>> =>
    new Map(
      [...(await samples.listPublishedByIgsns(igsns))].filter(([, parent]) =>
        canDeclareSubSample(parent, { role: null, managed: false }),
      ),
    );

export const accountChildCandidates =
  (samples: ServiceSampleChecksDeps["samples"], account: ServiceAccount) =>
  (igsns: string[]) =>
    samples.listPublicSeriesLinkCandidatesByIgsns(
      igsns,
      null,
      managerScope(account.id, account.managedGroups),
    );

export const resolvedIds = (
  resolved: readonly ResolvedRelated<{ id: string }>[],
): string[] =>
  resolved.flatMap(({ sample }) => (sample === null ? [] : [sample.id]));

export const normalizedIgsn = (igsn: string) =>
  igsnSchema.safeParse(igsn).data ?? igsn;

export const resolveParents = (
  samples: ServiceSampleChecksDeps["samples"],
  parents: readonly { igsn: string; relationIndex: number }[],
): Promise<ResolvedParent[]> =>
  resolveRelated(listDeclarableParents(samples), parents);
