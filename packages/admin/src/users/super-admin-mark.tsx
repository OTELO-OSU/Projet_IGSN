import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { ShieldCheckIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function SuperAdminMark() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="img" tabIndex={0} aria-label={m.user_super_admin()}>
          <ShieldCheckIcon aria-hidden="true" className="size-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{m.user_super_admin()}</TooltipContent>
    </Tooltip>
  );
}
