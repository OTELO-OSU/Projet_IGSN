import { buttonVariants } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import { Link } from "@tanstack/react-router";
import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import type { CardSample } from "#/domain/samples/card-fields.ts";

import {
  locationText,
  materialText,
  selectedCardFields,
  typeNatureText,
  collectorText,
} from "#/domain/samples/card-fields.ts";
import { exactRanges, matchRanges } from "#/domain/samples/highlight-match.ts";
import { m } from "#/paraglide/messages.js";

const SEARCH_HIGHLIGHT = "sample-search-match";

const sampleCardId = (igsn: string): string => `sample-card-${igsn}`;

export function focusSampleCard(igsn: string): boolean {
  const card = document.getElementById(sampleCardId(igsn));
  if (!card) return false;
  card.scrollIntoView({ block: "nearest" });
  card.querySelector("button")?.focus({ preventScroll: true });
  return true;
}

function toRange(node: Node, [start, end]: [number, number]): Range {
  const range = new Range();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

function elementRanges(element: Element, query: string): Range[] {
  const node = element.firstChild;
  if (node?.nodeType !== Node.TEXT_NODE) {
    return [];
  }
  const text = node.textContent ?? "";
  const ranges =
    element.getAttribute("data-highlight") === "exact"
      ? exactRanges(text, query)
      : matchRanges(text, query);
  return ranges.map((match) => toRange(node, match));
}

function CardLine({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground mt-1 text-sm">{children}</p>;
}

function CardDetails({
  sample,
  extraFields,
}: {
  sample: CardSample;
  extraFields: ReturnType<typeof selectedCardFields>;
}) {
  const kind = typeNatureText(sample);
  const material = materialText(sample);
  const place = locationText(sample.location);
  const collector = collectorText(sample);
  return (
    <>
      <p
        className="text-muted-foreground mt-1 font-mono text-sm break-all"
        data-highlight="exact"
      >
        {sample.igsn}
        {sample.internalNumber === null ? null : (
          <span className="ml-3">
            {formatInternalId(sample.internalNumber)}
          </span>
        )}
      </p>
      {kind ? <CardLine>{kind}</CardLine> : null}
      {material ? <CardLine>{material}</CardLine> : null}
      {place ? <CardLine>{place}</CardLine> : null}
      {collector ? (
        <CardLine>
          {m.card_field_line({
            label: m.sample_field_collector_name(),
            value: collector,
          })}
        </CardLine>
      ) : null}
      {extraFields.map((field) => {
        const value = field.get(sample);
        return value ? (
          <CardLine key={field.key}>
            {m.card_field_line({ label: field.label(), value })}
          </CardLine>
        ) : null;
      })}
    </>
  );
}

function ViewSampleLink({ igsn }: { igsn: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/samples/$igsn"
            params={{ igsn }}
            target="_blank"
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "absolute end-2 top-2 z-10 size-8",
            })}
          >
            <ExternalLinkIcon aria-hidden="true" />
            <span className="sr-only">
              {m.results_map_view_sample()} {m.opens_in_new_tab()}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>{m.results_map_view_sample()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SampleList({
  samples,
  query = "",
  fields,
  onHoverSample,
  singleColumn = false,
  selectedIgsn,
  onLocateSample,
}: {
  samples: CardSample[];
  query?: string;
  fields?: string[];
  onHoverSample?: (sample: CardSample | undefined) => void;
  singleColumn?: boolean;
  selectedIgsn?: string;
  onLocateSample?: (sample: CardSample) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const extraFields = selectedCardFields(fields);

  useEffect(() => {
    const container = listRef.current;
    if (!container || !("highlights" in CSS)) {
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      CSS.highlights.delete(SEARCH_HIGHLIGHT);
      return;
    }

    const ranges = [...container.querySelectorAll("[data-highlight]")].flatMap(
      (element) => elementRanges(element, trimmed),
    );
    CSS.highlights.set(SEARCH_HIGHLIGHT, new Highlight(...ranges));

    return () => {
      CSS.highlights.delete(SEARCH_HIGHLIGHT);
    };
  }, [query, samples]);

  return (
    <ul
      ref={listRef}
      className={singleColumn ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}
    >
      {samples.map((sample) => {
        const { igsn, name } = sample;
        if (igsn === null) {
          return null;
        }
        const hoverHandlers = {
          onMouseEnter: () => onHoverSample?.(sample),
          onMouseLeave: () => onHoverSample?.(undefined),
          onFocus: () => onHoverSample?.(sample),
          onBlur: () => onHoverSample?.(undefined),
        };
        if (!onLocateSample) {
          return (
            <li key={igsn} {...hoverHandlers}>
              <Link
                to="/samples/$igsn"
                params={{ igsn }}
                className="block rounded-lg border p-4 hover:border-sky-800 hover:bg-sky-50"
              >
                <h2 className="font-semibold text-sky-900" data-highlight>
                  {name}
                </h2>
                <CardDetails sample={sample} extraFields={extraFields} />
              </Link>
            </li>
          );
        }
        const isSelected = igsn === selectedIgsn;
        return (
          <li
            key={igsn}
            id={sampleCardId(igsn)}
            className={`relative scroll-my-3 rounded-lg border p-4 hover:border-sky-800 hover:bg-sky-50 ${isSelected ? "border-amber-500 bg-amber-50 ring-4 ring-amber-300" : ""}`}
            {...hoverHandlers}
          >
            <h2 className="pe-8 font-semibold text-sky-900">
              <button
                type="button"
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onLocateSample(sample)}
                className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-lg"
                data-highlight
              >
                {name}
              </button>
            </h2>
            <CardDetails sample={sample} extraFields={extraFields} />
            <ViewSampleLink igsn={igsn} />
          </li>
        );
      })}
    </ul>
  );
}
