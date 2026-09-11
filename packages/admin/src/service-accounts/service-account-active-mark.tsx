import { CheckIcon, XIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function ServiceAccountActiveMark({ active }: { active: boolean }) {
  const Icon = active ? CheckIcon : XIcon;

  return (
    <Icon
      role="img"
      aria-label={
        active ? m.service_account_active() : m.service_account_inactive()
      }
      className={`size-4 ${active ? "text-green-700" : "text-muted-foreground"}`}
    />
  );
}
