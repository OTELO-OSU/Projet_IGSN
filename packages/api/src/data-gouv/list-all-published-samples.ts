import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { NO_REACH } from "../service-account/service-routes.ts";

const PAGE_SIZE = 500;

export async function listAllPublishedSamples(
  samples: Pick<SampleRepository, "listPublishedForService">,
  perPage: number = PAGE_SIZE,
): Promise<Sample[]> {
  const all: Sample[] = [];
  for (let page = 1; ; page++) {
    const { data, total } = await samples.listPublishedForService(
      { page, perPage, sort: "igsn" },
      NO_REACH,
      false,
    );
    all.push(...data);
    if (data.length === 0 || all.length >= total) return all;
  }
}
