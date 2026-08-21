import type { LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { canAdminManualGroups } from "@projet-igsn/domain/user/can-admin-manual-groups";
import { canModerateUsers } from "@projet-igsn/domain/user/can-moderate-users";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Building2Icon,
  FlaskConicalIcon,
  MountainIcon,
  TelescopeIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { UserName } from "../user-name.tsx";
import { SignOutButton } from "./sign-out-button.tsx";
import { useCurrentUser } from "./use-current-user.ts";

const listSearch = { page: 1, perPage: DEFAULT_PAGE_SIZE };

const GROUPS_NAV_ID = "nav-institutional-groups";

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
  "hover:bg-accent aria-[current=page]:bg-accent flex items-center gap-2 rounded-md p-2 text-sm [&>svg]:size-4 [&>svg]:shrink-0";

function NavItem({
  to,
  search,
  Icon,
  label,
  isCurrent,
}: {
  to: LinkProps["to"];
  search?: LinkProps["search"];
  Icon: LucideIcon;
  label: string;
  isCurrent: boolean;
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
        {label}
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
  const isSamplesSection = pathname === "/" || pathname.startsWith("/samples");

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <aside className="flex flex-col gap-2 border-b p-2 md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <Link
          to="/"
          className="px-2 py-1 text-xl font-bold"
          search={listSearch}
        >
          {m.app_title()}
        </Link>
        <nav>
          <ul className="flex gap-1 md:flex-col">
            <NavItem
              to="/"
              search={listSearch}
              Icon={MountainIcon}
              label={m.nav_samples()}
              isCurrent={isSamplesSection}
            />
            {me && canModerateUsers(me) && (
              <NavItem
                to="/users"
                search={listSearch}
                Icon={UsersIcon}
                label={m.nav_users()}
                isCurrent={isUsersSection}
              />
            )}
            {me?.superAdmin && (
              <li>
                <p id={GROUPS_NAV_ID} className="p-2 text-sm font-medium">
                  {m.nav_institutional_groups()}
                </p>
                <ul aria-labelledby={GROUPS_NAV_ID} className="md:pl-3">
                  {GROUPS_NAV.map(({ to, Icon, label }) => (
                    <NavItem
                      key={to}
                      to={to}
                      Icon={Icon}
                      label={label()}
                      isCurrent={pathname.startsWith(to)}
                    />
                  ))}
                </ul>
              </li>
            )}
            {me && canAdminManualGroups(me) && (
              <NavItem
                to="/manual-groups"
                search={listSearch}
                Icon={UsersRoundIcon}
                label={m.nav_manual_groups()}
                isCurrent={pathname.startsWith("/manual-groups")}
              />
            )}
          </ul>
        </nav>
      </aside>
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <header className="border-b">
          <div className="flex items-center justify-end gap-4 px-6 py-4">
            <UserName />
            <Link to="/settings">{m.nav_settings()}</Link>
            <SignOutButton onSignOut={onSignOut} />
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
    </div>
  );
}
