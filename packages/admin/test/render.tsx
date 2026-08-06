import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderComponent } from "vitest-browser-react";

// One client per render keeps tests from sharing a cache; retries only make a
// failing request slow to surface.
export const render = (ui: ReactNode) =>
  renderComponent(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {ui}
    </QueryClientProvider>,
  );
