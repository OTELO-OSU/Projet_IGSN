import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { canDeclareSubSample } from "@projet-igsn/domain/user-sample/can-declare-sub-sample";

export async function resolvePublishedParents(
  repository: Pick<SampleRepository, "listPublishedByIgsns">,
  igsns: string[],
): Promise<ReadonlyMap<string, Sample>> {
  return new Map(
    [...(await repository.listPublishedByIgsns(igsns))].filter(([, parent]) =>
      canDeclareSubSample(parent, { role: null, managed: false }),
    ),
  );
}
