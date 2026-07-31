import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";

import { useQuery } from "@tanstack/react-query";

import { sampleQueryOptions } from "#/samples/use-sample.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useUserRoleOnSample(
  sampleId: string | undefined,
): UserSampleRole | null {
  const { data } = useQuery(sampleQueryOptions(useApiClient(), sampleId));
  return data?.role ?? null;
}
