import type { SampleRepository } from "@projet-igsn/domain/sample/repository";

import { createHttpSampleRepository } from "#/samples/repository.ts";
import { useApiClient } from "#/use-api-client.ts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

export function useSampleRepository(): SampleRepository {
  const apiFetch = useApiClient();
  return createHttpSampleRepository(API_URL, apiFetch);
}
