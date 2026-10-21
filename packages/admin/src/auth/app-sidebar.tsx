import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { ADMIN_DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { canAdminManualGroups } from "@projet-igsn/domain/user/can-admin-manual-groups";
import { canModerateUsers } from "@projet-igsn/domain/user/can-moderate-users";
import { useLocation } from "@tanstack/react-router";
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

import { isSamplesSection } from "./is-samples-section.ts";
import { NavItem } from "./nav-item.tsx";

const listSearch = { page: 1, perPage: ADMIN_DEFAULT_PAGE_SIZE };

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

export function AppSidebar({
  me,
  isCollapsed,
  toggleCollapsed,
}: {
  me: CurrentUser;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const isUsersSection = pathname.startsWith("/users");
  const isSampleModerationSection = pathname.startsWith(SAMPLE_MODERATION_PATH);

  return (
    <aside className="flex flex-col gap-2 border-b p-2 motion-reduce:transition-none md:sticky md:top-24 md:h-[calc(100vh-96px)] md:w-(--sidebar-width) md:shrink-0 md:overflow-hidden md:border-r md:border-b-0 md:transition-[width] md:duration-500 md:ease-in-out">
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
      <nav
        id={SIDEBAR_NAV_ID}
        className="flex flex-wrap gap-1 md:flex-1 md:flex-col md:flex-nowrap"
      >
        <ul className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
          <NavItem
            to="/"
            search={listSearch}
            Icon={MountainIcon}
            label={m.nav_samples()}
            isCurrent={isSamplesSection(pathname)}
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
                className={`text-primary px-3 py-2 text-sm font-medium whitespace-nowrap transition-opacity motion-reduce:transition-none ${isCollapsed ? "md:opacity-0" : ""}`}
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
          <NavItem
            href={FRONTEND_URL}
            Icon={GlobeIcon}
            label={m.nav_public_site()}
            isCollapsed={isCollapsed}
          />
        </ul>
      </nav>
    </aside>
  );
}
