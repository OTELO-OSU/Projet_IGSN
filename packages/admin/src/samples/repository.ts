import type {
  ListSamplesParams,
  ListSamplesResult,
  SampleRepository,
} from "@projet-igsn/domain/sample/repository";
import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import {
  createSampleResponseSchema,
  listSamplesResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";

export function createHttpSampleRepository(
  apiUrl: string,
  fetchFn: typeof fetch = fetch,
): SampleRepository {
  const base = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
  const samplesUrl = () => new URL("samples", base);

  return {
    async list({
      page,
      perPage,
    }: ListSamplesParams): Promise<ListSamplesResult> {
      const url = samplesUrl();
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));

      const res = await fetchFn(url);
      if (!res.ok) {
        throw new Error(`Failed to load samples (${res.status})`);
      }
      const { data, meta } = listSamplesResponseSchema.parse(await res.json());
      return { data, total: meta.total };
    },

    async create(input: CreateSample): Promise<Sample> {
      const res = await fetchFn(samplesUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(`Failed to create sample (${res.status})`);
      }
      return createSampleResponseSchema.parse(await res.json()).data;
    },
  };
}
