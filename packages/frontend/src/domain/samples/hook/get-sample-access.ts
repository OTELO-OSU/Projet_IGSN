import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { getSampleAccess } from "#/domain/samples/client/get-sample-access.ts";

export function useGetSampleAccess(id: string): boolean {
  const token = useAuth().user?.access_token;
  const { data } = useQuery({
    queryKey: ["sample-access", id],
    queryFn: () => getSampleAccess(id, token ?? ""),
    enabled: Boolean(token),
  });
  return data === true;
}
