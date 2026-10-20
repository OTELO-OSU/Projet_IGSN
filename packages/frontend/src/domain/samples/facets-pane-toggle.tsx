import type { Ref } from "react";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function FacetsPaneToggle({
  ref,
  isCollapsed,
  count,
  onCollapsedChange,
}: {
  ref?: Ref<HTMLButtonElement>;
  isCollapsed: boolean;
  count: number;
  onCollapsedChange: (isCollapsed: boolean) => void;
}) {
  const label = !isCollapsed
    ? m.facets_hide()
    : count === 0
      ? m.facets_show()
      : m.facets_show_count({ count });
  const Icon = isCollapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-expanded={!isCollapsed}
            className="relative"
            onClick={() => onCollapsedChange(!isCollapsed)}
          >
            <Icon aria-hidden="true" />
            {isCollapsed && count > 0 ? (
              <Badge
                aria-hidden="true"
                className="absolute -end-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {count}
              </Badge>
            ) : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
