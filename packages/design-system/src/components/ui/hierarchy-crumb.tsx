import type { ReactNode } from "react";

import { XIcon } from "lucide-react";

import { cn } from "../../lib/utils.ts";
import { Badge } from "./badge.tsx";
import { TruncatedText } from "./truncated-text.tsx";

type HierarchyCrumbProps = {
  label: string;
  level: number;
  depth: number;
  locked: boolean;
  adornment: ReactNode;
  removeLabel: string;
  onEdit: () => void;
  onRemove: () => void;
};

export function HierarchyCrumb({
  label,
  level,
  depth,
  locked,
  adornment,
  removeLabel,
  onEdit,
  onRemove,
}: HierarchyCrumbProps) {
  return (
    <>
      {level > 0 ? (
        <span aria-hidden className="text-muted-foreground text-xs">
          {">"}
        </span>
      ) : null}
      <Badge
        variant="secondary"
        className={cn(
          "max-w-full min-w-0",
          !locked && "gap-1 pr-1",
          locked && "bg-background text-foreground/70",
          level === depth && "ring-2 ring-ring",
          level > depth && "opacity-50",
        )}
      >
        {locked ? (
          <>
            <TruncatedText>{label}</TruncatedText>
            {adornment}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="min-w-0 hover:underline"
            >
              <TruncatedText>{label}</TruncatedText>
            </button>
            {adornment}
            <button
              type="button"
              aria-label={removeLabel}
              onClick={onRemove}
              className="hover:bg-foreground/10 shrink-0 rounded-full"
            >
              <XIcon className="size-3" />
            </button>
          </>
        )}
      </Badge>
    </>
  );
}
