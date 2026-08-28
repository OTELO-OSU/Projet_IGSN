import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";

import "./styles.css";
import { onSigninCallback, userManager } from "./auth/oidc-config.ts";
import { ErrorView } from "./error-view.tsx";
import { retryDelay, shouldRetry } from "./http-error.ts";
import { watchIdleRenew } from "./idle-renew.ts";
import { routeTree } from "./routeTree.gen.ts";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetry, retryDelay } },
  queryCache: new QueryCache({
    onError: (error, query) =>
      console.error("Query failed", query.queryKey, error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => console.error("Mutation failed", error),
  }),
});
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultErrorComponent: ({ error }) => <ErrorView error={error} />,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

watchIdleRenew(userManager);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
