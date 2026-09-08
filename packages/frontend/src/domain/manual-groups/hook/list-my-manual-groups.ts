import { skipToken, useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { listMyManualGroups } from "#/domain/manual-groups/client/list-my-manual-groups.ts";

export function useListMyManualGroups() {
  const user = useAuth().user;
  const token = user?.access_token;
  return useQuery({
    queryKey: ["my-manual-groups", user?.profile.sub],
    queryFn: token ? () => listMyManualGroups(token) : skipToken,
  });
}
