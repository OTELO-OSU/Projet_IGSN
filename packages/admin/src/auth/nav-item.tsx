import type { LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { Link } from "@tanstack/react-router";

const navLinkClass =
  "text-primary hover:bg-primary/5 aria-[current=page]:bg-primary/10 flex items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap [&>svg]:size-4 [&>svg]:shrink-0";

export function NavItem({
  to,
  search,
  Icon,
  label,
  isCurrent,
  isCollapsed,
}: {
  to: LinkProps["to"];
  search?: LinkProps["search"];
  Icon: LucideIcon;
  label: string;
  isCurrent: boolean;
  isCollapsed: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        search={search}
        className={navLinkClass}
        aria-current={isCurrent ? "page" : undefined}
      >
        <Icon />
        <span
          className={`transition-opacity motion-reduce:transition-none ${isCollapsed ? "md:opacity-0" : ""}`}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}
