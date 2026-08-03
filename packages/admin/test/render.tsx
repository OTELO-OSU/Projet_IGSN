import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderComponent } from "vitest-browser-react";

// SampleForm's action buttons read the caller's role on the sample through
// react-query, so rendering it needs a client like the app tree provides. One
// client per render keeps tests from sharing a cache.
export const render = (ui: ReactNode) =>
  renderComponent(
    <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>,
  );
