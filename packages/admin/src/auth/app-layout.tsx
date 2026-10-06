import type { LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { canAdminManualGroups } from "@projet-igsn/domain/user/can-admin-manual-groups";
import { canModerateSamples } from "@projet-igsn/domain/user/can-moderate-samples";
import { canModerateUsers } from "@projet-igsn/domain/user/can-moderate-users";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BotIcon,
  Building2Icon,
  ChevronsLeftIcon,
  FlaskConicalIcon,
  GlobeIcon,
  MountainIcon,
  ShieldCheckIcon,
  TelescopeIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";

import { UserMenu } from "../user-menu.tsx";
import { useCurrentUser } from "./use-current-user.ts";
import { useSidebarCollapsed } from "./use-sidebar-collapsed.ts";

const listSearch = { page: 1, perPage: DEFAULT_PAGE_SIZE };

const SAMPLE_MODERATION_PATH = "/samples/moderation";

const GROUPS_NAV_ID = "nav-institutional-groups";

const SIDEBAR_NAV_ID = "sidebar-nav";

const SERVICE_ACCOUNTS_PATH = "/service-accounts";

const GROUPS_NAV = [
  {
    to: "/institutional-groups/organizations",
    Icon: Building2Icon,
    label: m.nav_organizations,
  },
  { to: "/institutional-groups/osus", Icon: TelescopeIcon, label: m.nav_osus },
  {
    to: "/institutional-groups/laboratories",
    Icon: FlaskConicalIcon,
    label: m.nav_laboratories,
  },
] as const;

const navLinkClass =
  "hover:bg-accent aria-[current=page]:bg-accent flex items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm whitespace-nowrap [&>svg]:size-4 [&>svg]:shrink-0";

function NavItem({
  to,
  search,
  Icon,
  label,
  isCurrent,
  isCollapsed,
}: {
  to: LinkProps["to"];
  search?: LinkProps["search"];
  Icon: LucideIcon;
  label: string;
  isCurrent: boolean;
  isCollapsed: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        search={search}
        className={navLinkClass}
        aria-current={isCurrent ? "page" : undefined}
      >
        <Icon />
        <span
          className={`transition-opacity motion-reduce:transition-none ${isCollapsed ? "md:opacity-0" : ""}`}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}

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
  const isSampleModerationSection = pathname.startsWith(SAMPLE_MODERATION_PATH);
  const isSamplesSection = pathname === "/" || pathname === "/samples/create";

  const [isCollapsed, toggleCollapsed] = useSidebarCollapsed();
  const hasSidebar = me !== undefined && canModerateSamples(me);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header
        className={cn(
          "flex h-16 items-center justify-between gap-4 border-b pr-6",
          !hasSidebar && "pl-4.5",
        )}
      >
        <Link to="/" search={listSearch} className="flex h-full items-center">
          <img
            src={`${import.meta.env.BASE_URL}logo-igsn.png`}
            alt={m.app_title()}
            className="h-full w-auto"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <a href={FRONTEND_URL}>
              <GlobeIcon />
              {m.nav_public_site()}
            </a>
          </Button>
          <UserMenu onSignOut={onSignOut} />
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
          <aside className="flex flex-col gap-2 border-b p-2 motion-reduce:transition-none md:w-(--sidebar-width) md:shrink-0 md:overflow-hidden md:border-r md:border-b-0 md:transition-[width] md:duration-500 md:ease-in-out">
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-10 self-end md:inline-flex"
              aria-label={isCollapsed ? m.nav_expand() : m.nav_collapse()}
              aria-expanded={!isCollapsed}
              aria-controls={SIDEBAR_NAV_ID}
              onClick={toggleCollapsed}
            >
              <ChevronsLeftIcon
                className={`transition-transform duration-500 ease-in-out ${isCollapsed ? "rotate-180" : ""}`}
              />
            </Button>
            <nav id={SIDEBAR_NAV_ID}>
              <ul className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
                <NavItem
                  to="/"
                  search={listSearch}
                  Icon={MountainIcon}
                  label={m.nav_samples()}
                  isCurrent={isSamplesSection}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  to={SAMPLE_MODERATION_PATH}
                  search={listSearch}
                  Icon={ShieldCheckIcon}
                  label={m.nav_sample_moderation()}
                  isCurrent={isSampleModerationSection}
                  isCollapsed={isCollapsed}
                />
                {canModerateUsers(me) && (
                  <NavItem
                    to="/users"
                    search={listSearch}
                    Icon={UsersIcon}
                    label={m.nav_users()}
                    isCurrent={isUsersSection}
                    isCollapsed={isCollapsed}
                  />
                )}
                {me.superAdmin && (
                  <li>
                    <p
                      id={GROUPS_NAV_ID}
                      className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-opacity motion-reduce:transition-none ${isCollapsed ? "md:opacity-0" : ""}`}
                    >
                      {m.nav_institutional_groups()}
                    </p>
                    <ul
                      aria-labelledby={GROUPS_NAV_ID}
                      className={isCollapsed ? undefined : "md:pl-3"}
                    >
                      {GROUPS_NAV.map(({ to, Icon, label }) => (
                        <NavItem
                          key={to}
                          to={to}
                          Icon={Icon}
                          label={label()}
                          isCurrent={pathname.startsWith(to)}
                          isCollapsed={isCollapsed}
                        />
                      ))}
                    </ul>
                  </li>
                )}
                {me.superAdmin && (
                  <NavItem
                    to={SERVICE_ACCOUNTS_PATH}
                    search={listSearch}
                    Icon={BotIcon}
                    label={m.nav_service_accounts()}
                    isCurrent={pathname.startsWith(SERVICE_ACCOUNTS_PATH)}
                    isCollapsed={isCollapsed}
                  />
                )}
                {canAdminManualGroups(me) && (
                  <NavItem
                    to="/manual-groups"
                    search={listSearch}
                    Icon={UsersRoundIcon}
                    label={m.nav_manual_groups()}
                    isCurrent={pathname.startsWith("/manual-groups")}
                    isCollapsed={isCollapsed}
                  />
                )}
              </ul>
            </nav>
          </aside>
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
