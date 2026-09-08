import { skipToken, useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { listAttachableManualGroups } from "#/domain/manual-groups/client/list-attachable-manual-groups.ts";

export function useListAttachableManualGroups() {
  const user = useAuth().user;
  const token = user?.access_token;
  return useQuery({
    queryKey: ["attachable-manual-groups", user?.profile.sub],
    queryFn: token ? () => listAttachableManualGroups(token) : skipToken,
  });
}
