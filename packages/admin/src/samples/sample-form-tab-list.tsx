import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  TabsList,
  TabsTrigger,
} from "@projet-igsn/design-system/components/ui/tabs";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { samplePublishRequirements } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRef } from "react";

import type { AttachmentMetadata } from "#/samples/use-attachment-changes.ts";

import { m } from "#/paraglide/messages.js";
import {
  parentTabLabel,
  SAMPLE_FORM_TABS,
  type SampleFormTab,
  tabCompleteness,
} from "#/samples/sample-form-tabs.ts";
import { samplePublishInput } from "#/samples/sample-publish-input.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";
import { useScrollEdges } from "#/samples/use-scroll-edges.ts";

const FADE_WIDTH = "2.5rem";

const edgeFade = (canScrollStart: boolean, canScrollEnd: boolean) =>
  `linear-gradient(to right, ${canScrollStart ? "transparent" : "black"}, black ${FADE_WIDTH}, black calc(100% - ${FADE_WIDTH}), ${canScrollEnd ? "transparent" : "black"})`;

export function SampleFormTabList({
  parentCount,
  attachments,
  isTabDisabled,
}: {
  parentCount: number;
  attachments: AttachmentMetadata[];
  isTabDisabled: (tab: SampleFormTab) => boolean;
}) {
  const form = useSampleForm();
  const listRef = useRef<HTMLDivElement>(null);
  const { canScrollStart, canScrollEnd } = useScrollEdges(listRef);
  const scrollBy = (direction: -1 | 1) =>
    listRef.current?.scrollBy({
      left: direction * listRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  return (
    <form.Subscribe selector={(state) => state.values}>
      {(values) => {
        const completeness = tabCompleteness(
          samplePublishRequirements(samplePublishInput(values, attachments)),
        );
        return (
          <div className="flex shadow-[inset_0_-1px_0_var(--color-border)]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              tabIndex={-1}
              aria-label={m.tabs_scroll_previous()}
              className="self-center"
              disabled={!canScrollStart}
              onClick={() => scrollBy(-1)}
            >
              <ChevronLeftIcon />
            </Button>
            <TabsList
              ref={listRef}
              style={{ maskImage: edgeFade(canScrollStart, canScrollEnd) }}
              variant="line"
              className="h-auto min-w-0 flex-1 [scrollbar-width:none] justify-start gap-2 overflow-x-auto rounded-none p-0 group-data-[orientation=horizontal]/tabs:h-auto"
            >
              {SAMPLE_FORM_TABS.filter(
                ({ value }) => value !== "parent" || parentCount > 0,
              ).map(({ value, label, icon: Icon }) => {
                const count = completeness[value];
                return (
                  <TabsTrigger
                    key={value}
                    value={value}
                    disabled={isTabDisabled(value)}
                    className="text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground h-auto flex-none gap-2 rounded-none border-x-0 border-t-0 border-b-[3px] border-transparent px-3 py-2 text-base after:hidden data-[state=active]:shadow-none"
                  >
                    <Icon className="size-4" aria-hidden />
                    {value === "parent" ? parentTabLabel(parentCount) : label()}
                    {count ? (
                      <>
                        {" "}
                        <span
                          className={cn(
                            "ml-1 text-xs tabular-nums",
                            count.filled === count.total
                              ? "text-emerald-700"
                              : "text-muted-foreground",
                          )}
                        >
                          ({count.filled}/{count.total})
                        </span>
                      </>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              tabIndex={-1}
              aria-label={m.tabs_scroll_next()}
              className="self-center"
              disabled={!canScrollEnd}
              onClick={() => scrollBy(1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        );
      }}
    </form.Subscribe>
  );
}
