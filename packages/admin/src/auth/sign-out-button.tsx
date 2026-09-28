import type { ComponentProps } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { LogOut } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function SignOutButton({
  onSignOut,
  variant = "outline",
  size = "sm",
}: { onSignOut: () => void } & Pick<
  ComponentProps<typeof Button>,
  "variant" | "size"
>) {
  return (
    <Button type="button" variant={variant} size={size} onClick={onSignOut}>
      <LogOut />
      {m.action_sign_out()}
    </Button>
  );
}
