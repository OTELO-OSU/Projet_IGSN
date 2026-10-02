import { useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip.tsx";

export function TruncatedText({ children }: { children: string }) {
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
          <span ref={textRef} className="block min-w-0 truncate">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
