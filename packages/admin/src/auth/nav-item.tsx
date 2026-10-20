import type { LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { NAV_LINK_CLASS } from "@projet-igsn/design-system/lib/nav-link-class";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { Link } from "@tanstack/react-router";

const navItemClass = cn(
  NAV_LINK_CLASS,
  "gap-2 overflow-hidden px-3 py-2 text-sm whitespace-nowrap [&>svg]:size-4 [&>svg]:shrink-0",
);

export function NavItem({
  to,
  search,
  href,
  Icon,
  label,
  isCurrent = false,
  isCollapsed,
}: {
  to?: LinkProps["to"];
  search?: LinkProps["search"];
  href?: string;
  Icon: LucideIcon;
  label: string;
  isCurrent?: boolean;
  isCollapsed: boolean;
}) {
  const content = (
    <>
      <Icon />
      <span
        className={`transition-opacity motion-reduce:transition-none ${isCollapsed ? "md:opacity-0" : ""}`}
      >
        {label}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} className={navItemClass}>
          {content}
        </a>
      ) : (
        <Link
          to={to}
          search={search}
          className={navItemClass}
          aria-current={isCurrent ? "page" : undefined}
        >
          {content}
        </Link>
      )}
    </li>
  );
}
