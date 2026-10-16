import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { activeFacetKeys } from "@projet-igsn/domain/sample/search/facets";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { m } from "#/paraglide/messages.js";

export function FacetsDialog({
  values,
  children,
}: {
  values: Record<string, unknown>;
  children: ReactNode;
}) {
  const count = activeFacetKeys(values).filter(
    (key) => !key.endsWith("Unit"),
  ).length;
  const barRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const observer = new IntersectionObserver(
      (entries) =>
        setIsPinned(entries.some((entry) => entry.intersectionRatio < 1)),
      { threshold: 1 },
    );
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <Dialog>
      <div
        ref={barRef}
        className={`sticky -bottom-px z-30 flex h-14 items-center lg:hidden ${isPinned ? "" : "px-6"}`}
      >
        <DialogTrigger asChild>
          <Button
            type="button"
            className={`h-full w-full text-base ${isPinned ? "rounded-none" : ""}`}
          >
            <SlidersHorizontalIcon aria-hidden="true" />
            {count === 0 ? m.facets_title() : m.facets_open_count({ count })}
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent
        closeLabel={m.action_close()}
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none"
      >
        <DialogHeader className="flex-row items-center justify-between px-6 pt-4">
          <DialogTitle>{m.facets_title()}</DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.action_close()}
              className="size-11"
            >
              <XIcon aria-hidden className="size-6" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6">{children}</div>
        <DialogClose asChild>
          <Button type="button" className="h-14 w-full rounded-none text-base">
            {m.facets_show_results()}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
