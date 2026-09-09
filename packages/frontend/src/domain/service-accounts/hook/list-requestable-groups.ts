import { skipToken, useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { listRequestableGroups } from "#/domain/service-accounts/client/list-requestable-groups.ts";

export function useListRequestableGroups() {
  const user = useAuth().user;
  const token = user?.access_token;
  return useQuery({
    queryKey: ["requestable-groups", user?.profile.sub],
    queryFn: token ? () => listRequestableGroups(token) : skipToken,
  });
}
