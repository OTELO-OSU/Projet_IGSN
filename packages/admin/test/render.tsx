import type { ReactNode } from "react";

import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderComponent } from "vitest-browser-react";

export const render = (ui: ReactNode) =>
  renderComponent(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
