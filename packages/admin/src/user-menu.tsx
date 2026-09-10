import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { ChevronDownIcon, LogOut, SettingsIcon, UserIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { SignOutButton } from "./auth/sign-out-button.tsx";
import { useCurrentUser } from "./auth/use-current-user.ts";

export function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { data, isError } = useCurrentUser();

  if (isError)
    return (
      <>
        <p role="alert">{m.user_name_error()}</p>
        <SignOutButton onSignOut={onSignOut} />
      </>
    );
  if (!data) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UserIcon />
          {data.name ?? data.username ?? data.sub}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SettingsIcon />
            {m.nav_settings()}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut />
          {m.action_sign_out()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
