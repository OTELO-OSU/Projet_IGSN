import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderComponent } from "vitest-browser-react";

// One client per render keeps tests from sharing a cache.
export const render = (ui: ReactNode) =>
  renderComponent(
    <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>,
  );
