import type { ReactNode } from "react";

import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { Link, useLocation } from "@tanstack/react-router";
import { MountainIcon, UsersIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { UserName } from "../user-name.tsx";
import { SignOutButton } from "./sign-out-button.tsx";
import { useCurrentUser } from "./use-current-user.ts";

const listSearch = { page: 1, perPage: DEFAULT_PAGE_SIZE };

const navLinkClass =
  "hover:bg-accent aria-[current=page]:bg-accent flex items-center gap-2 rounded-md p-2 text-sm [&>svg]:size-4 [&>svg]:shrink-0";

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
            <li>
              <Link
                to="/"
                search={listSearch}
                className={navLinkClass}
                aria-current={isSamplesSection ? "page" : undefined}
              >
                <MountainIcon />
                {m.nav_samples()}
              </Link>
            </li>
            {me?.superAdmin && (
              <li>
                <Link
                  to="/users"
                  search={listSearch}
                  className={navLinkClass}
                  aria-current={isUsersSection ? "page" : undefined}
                >
                  <UsersIcon />
                  {m.nav_users()}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>
      <div className="flex min-h-screen w-full flex-1 flex-col">
        <header className="border-b">
          <div className="flex items-center justify-end gap-4 px-6 py-4">
            <Link to="/settings">{m.nav_settings()}</Link>
            <UserName />
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
