import { useRef, useState } from "react";

import { cn } from "#/lib/utils.ts";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip.tsx";

export function TruncatedText({
  children,
  truncate = "end",
  className,
}: {
  children: string;
  truncate?: "start" | "end";
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const isOverflowing = () =>
    textRef.current !== null &&
    textRef.current.scrollWidth > textRef.current.clientWidth;

  return (
    <TooltipProvider>
      <Tooltip
        open={isOpen}
        onOpenChange={(next) => setIsOpen(next && isOverflowing())}
      >
        <TooltipTrigger asChild>
          <span
            ref={textRef}
            dir={truncate === "start" ? "rtl" : undefined}
            className={cn(
              "block min-w-0 truncate",
              truncate === "start" && "text-left",
              className,
            )}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
