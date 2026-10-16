import type { ReactNode } from "react";

import logoIgsnUrl from "@projet-igsn/design-system/assets/logo-igsn.svg";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { canModerateSamples } from "@projet-igsn/domain/user/can-moderate-samples";
import { Link } from "@tanstack/react-router";
import { GlobeIcon } from "lucide-react";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";

import { UserMenu } from "../user-menu.tsx";
import { AppSidebar } from "./app-sidebar.tsx";
import { useCurrentUser } from "./use-current-user.ts";
import { useSidebarCollapsed } from "./use-sidebar-collapsed.ts";

const listSearch = { page: 1, perPage: DEFAULT_PAGE_SIZE };

export function AppLayout({
  onSignOut,
  children,
}: {
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const { data: me } = useCurrentUser();

  const [isCollapsed, toggleCollapsed] = useSidebarCollapsed();
  const hasSidebar = me !== undefined && canModerateSamples(me);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="flex h-20 items-center gap-3 px-6 sm:h-24 sm:gap-6">
          <Link to="/" search={listSearch} className="shrink-0">
            <img
              src={logoIgsnUrl}
              alt={m.app_title()}
              className="h-12 w-auto sm:h-16"
            />
          </Link>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="secondary">
              <a href={FRONTEND_URL}>
                <GlobeIcon />
                {m.nav_public_site()}
              </a>
            </Button>
            <UserMenu onSignOut={onSignOut} />
          </div>
        </div>
      </header>
      <div
        className={cn(
          "flex w-full flex-1 flex-col [--sidebar-width:0rem] md:flex-row",
          hasSidebar &&
            (isCollapsed
              ? "md:[--sidebar-width:3.5rem]"
              : "md:[--sidebar-width:16rem]"),
        )}
      >
        {hasSidebar && (
          <AppSidebar
            me={me}
            isCollapsed={isCollapsed}
            toggleCollapsed={toggleCollapsed}
          />
        )}
        <main className="flex w-full min-w-0 flex-col gap-4 p-6">
          {me?.status === "pending" && (
            <p
              role="status"
              className="bg-muted rounded-md border px-4 py-3 text-sm"
            >
              {m.account_pending_banner()}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
