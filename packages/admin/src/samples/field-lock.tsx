import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { LockIcon, LockOpenIcon } from "lucide-react";

export function FieldLock({
  isClosed,
  text,
}: {
  isClosed: boolean;
  text: string;
}) {
  const Icon = isClosed ? LockIcon : LockOpenIcon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={text}>
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
