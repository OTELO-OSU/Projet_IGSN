import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

export function getContext() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        console.error("Query failed", query.queryKey, error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        console.error("Mutation failed", error);
      },
    }),
  });

  return {
    queryClient,
  };
}
