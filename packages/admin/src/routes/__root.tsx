import type { QueryClient } from "@tanstack/react-query";

import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { getLocale } from "#/paraglide/runtime.js";

import { AuthGate } from "../auth/auth-gate.tsx";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    beforeLoad: () => {
      document.documentElement.setAttribute("lang", getLocale());
    },
    component: () => (
      <AuthGate>
        <Outlet />
        <Toaster />
      </AuthGate>
    ),
  },
);
