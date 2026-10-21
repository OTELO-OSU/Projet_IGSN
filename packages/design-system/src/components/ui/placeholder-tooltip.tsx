import { Slot } from "radix-ui";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";

const PlaceholderTooltipContext = createContext(false);

export const PlaceholderTooltipProvider = PlaceholderTooltipContext.Provider;

function UndescribedTrigger({
  "aria-describedby": _tooltipId,
  ...props
}: ComponentProps<typeof Slot.Root>): ReactNode {
  return <Slot.Root {...props} />;
}

type PlaceholderTooltipProps = {
  placeholder?: string;
  disabled?: boolean;
  children: ReactNode;
};

export function PlaceholderTooltip({
  placeholder,
  disabled,
  children,
}: PlaceholderTooltipProps): ReactNode {
  const isEnabled = useContext(PlaceholderTooltipContext);
  if (!isEnabled || !placeholder) return children;
  return (
    <Tooltip open={disabled ? false : undefined}>
      <TooltipTrigger asChild>
        <UndescribedTrigger>{children}</UndescribedTrigger>
      </TooltipTrigger>
      <TooltipContent className="max-w-[var(--radix-tooltip-trigger-width)]">
        {placeholder}
      </TooltipContent>
    </Tooltip>
  );
}
