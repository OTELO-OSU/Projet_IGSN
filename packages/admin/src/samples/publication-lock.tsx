import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { LockIcon, LockOpenIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function PublicationLock({ isPublished }: { isPublished: boolean }) {
  const text = isPublished
    ? m.field_locked_since_publication()
    : m.field_locked_after_publication();
  const Icon = isPublished ? LockIcon : LockOpenIcon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={text}>
          <Icon aria-hidden="true" className="text-muted-foreground size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
