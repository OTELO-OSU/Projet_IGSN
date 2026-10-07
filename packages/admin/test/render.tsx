import type { ReactNode } from "react";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { render as renderComponent } from "vitest-browser-react";

export const render = (ui: ReactNode) =>
  renderComponent(
    <RouterContextProvider
      router={createRouter({
        routeTree: createRootRoute(),
        history: createMemoryHistory(),
      })}
    >
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <TooltipProvider>{ui}</TooltipProvider>
      </QueryClientProvider>
    </RouterContextProvider>,
  );
