import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@projet-igsn/design-system/components/ui/sidebar";
import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { Link, useLocation } from "@tanstack/react-router";
import { MountainIcon, UsersIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { UserName } from "../user-name.tsx";
import { SignOutButton } from "./sign-out-button.tsx";
import { useCurrentUser } from "./use-current-user.ts";

const listSearch = { page: 1, perPage: DEFAULT_PAGE_SIZE };

export function AppLayout({
  onSignOut,
  children,
}: {
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const { data: me } = useCurrentUser();
  const pathname = useLocation({ select: (location) => location.pathname });
  const isUsersSection = pathname.startsWith("/users");
  const isSamplesSection = pathname === "/" || pathname.startsWith("/samples");

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link
            to="/"
            className="px-2 py-1 text-xl font-bold"
            search={listSearch}
          >
            {m.app_title()}
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <nav>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isSamplesSection}>
                  <Link to="/" search={listSearch}>
                    <MountainIcon />
                    {m.nav_samples()}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {me?.superAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isUsersSection}>
                    <Link to="/users" search={listSearch}>
                      <UsersIcon />
                      {m.nav_users()}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </nav>
        </SidebarContent>
      </Sidebar>
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <header className="border-b">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <Link to="/settings">{m.nav_settings()}</Link>
              <UserName />
              <SignOutButton onSignOut={onSignOut} />
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
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
    </SidebarProvider>
  );
}
