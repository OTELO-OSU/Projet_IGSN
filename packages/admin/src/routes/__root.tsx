import type { QueryClient } from "@tanstack/react-query";

import { PlaceholderTooltipProvider } from "@projet-igsn/design-system/components/ui/placeholder-tooltip";
import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { getLocale } from "#/paraglide/runtime.js";

import { AuthGate } from "../auth/auth-gate.tsx";
import { DemoBanner } from "../demo-banner.tsx";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    beforeLoad: () => {
      document.documentElement.setAttribute("lang", getLocale());
    },
    component: () => (
      <TooltipProvider>
        <PlaceholderTooltipProvider value>
          <DemoBanner />
          <AuthGate>
            <Outlet />
            {/* Clears the sample form's fixed action bar, so a toast never covers Publish. */}
            <Toaster offset={{ bottom: 80 }} mobileOffset={{ bottom: 80 }} />
          </AuthGate>
        </PlaceholderTooltipProvider>
      </TooltipProvider>
    ),
  },
);
