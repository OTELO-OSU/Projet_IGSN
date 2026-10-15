import { createContext, useContext, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";

const PlaceholderTooltipContext = createContext(false);

export const PlaceholderTooltipProvider = PlaceholderTooltipContext.Provider;

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
      <TooltipTrigger asChild aria-describedby={undefined}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-[var(--radix-tooltip-trigger-width)]">
        {placeholder}
      </TooltipContent>
    </Tooltip>
  );
}
