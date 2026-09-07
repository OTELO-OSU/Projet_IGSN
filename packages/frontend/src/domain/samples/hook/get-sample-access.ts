import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { getSampleAccess } from "#/domain/samples/client/get-sample-access.ts";

export function useGetSampleAccess(id: string): boolean {
  const user = useAuth().user;
  const token = user?.access_token;
  const { data } = useQuery({
    queryKey: ["sample-access", id, user?.profile.sub],
    queryFn: () => getSampleAccess(id, token ?? ""),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });
  return data === true;
}
