import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { UserName } from "../user-name.tsx";

export function AppLayout({
  onSignOut,
  children,
}: {
  onSignOut: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-xl font-bold"
            search={{
              page: 1,
              perPage: 25,
            }}
          >
            {m.app_title()}
          </Link>
          <div className="flex items-center gap-4">
            <UserName />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSignOut}
            >
              <LogOut />
              {m.action_sign_out()}
            </Button>
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
        {children}
      </main>
    </div>
  );
}
