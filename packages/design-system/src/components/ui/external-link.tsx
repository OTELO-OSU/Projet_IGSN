import type { ReactNode } from "react";

import { cn } from "#/lib/utils.ts";

// An anchor to an external site, opening in a new tab. noopener/noreferrer are
// the safe default for target=_blank; callers add layout classes via className.
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-sky-800 underline", className)}
    >
      {children}
    </a>
  );
}
