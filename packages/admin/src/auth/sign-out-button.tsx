import { Button } from "@projet-igsn/design-system/components/ui/button";
import { LogOut } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onSignOut}>
      <LogOut />
      {m.action_sign_out()}
    </Button>
  );
}
