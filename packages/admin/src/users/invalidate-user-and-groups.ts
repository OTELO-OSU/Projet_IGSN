import type { QueryClient } from "@tanstack/react-query";

export const invalidateUserAndGroups = (
  queryClient: QueryClient,
  userId: string,
): Promise<unknown> =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["users"] }),
    queryClient.invalidateQueries({ queryKey: ["user", userId] }),
    queryClient.invalidateQueries({ queryKey: ["manual-groups"] }),
    queryClient.invalidateQueries({
      queryKey: ["institutional-group-manager-counts"],
    }),
    queryClient.invalidateQueries({ queryKey: ["currentUser"] }),
  ]);
