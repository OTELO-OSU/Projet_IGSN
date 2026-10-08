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
import { CARD_LINE_ICONS } from "#/domain/samples/card-line-icons.ts";
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

function CardLine({
  field,
  label,
  children,
}: {
  field: string;
  label: string;
  children: React.ReactNode;
}) {
  const Icon = CARD_LINE_ICONS[field];
  return (
    <p className="mt-1 flex gap-1.5 text-sm">
      {Icon ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Icon
                role="img"
                aria-label={label}
                className="mt-0.5 size-4 shrink-0"
              />
            </TooltipTrigger>
            <TooltipContent side="left">{label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
      {children}
    </p>
  );
}

function CardDetails({
  sample,
  hasInternalId,
  extraFields,
}: {
  sample: CardSample;
  hasInternalId: boolean;
  extraFields: ReturnType<typeof selectedCardFields>;
}) {
  const kind = typeNatureText(sample);
  const material = materialText(sample);
  const place = locationText(sample.location);
  const collector = collectorText(sample);
  return (
    <>
      <p
        className="text-muted-foreground mt-1 font-mono text-xs break-all"
        data-highlight="exact"
      >
        {sample.igsn}
      </p>
      {!hasInternalId || sample.internalNumber === null ? null : (
        <p className="text-muted-foreground font-mono text-xs">
          {formatInternalId(sample.internalNumber)}
        </p>
      )}
      {kind ? (
        <CardLine field="typeNature" label={m.card_field_type_nature()}>
          {kind}
        </CardLine>
      ) : null}
      {material ? (
        <CardLine field="material" label={m.sample_field_material()}>
          {material}
        </CardLine>
      ) : null}
      {place ? (
        <CardLine field="location" label={m.card_field_location()}>
          {place}
        </CardLine>
      ) : null}
      {collector ? (
        <CardLine field="collectorName" label={m.sample_field_collector_name()}>
          {collector}
        </CardLine>
      ) : null}
      {extraFields.map((field) => {
        const value = field.get(sample);
        return value ? (
          <CardLine key={field.key} field={field.key} label={field.label()}>
            {value}
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
  const hasInternalId = fields?.includes("internalNumber") ?? false;

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
                className="hover:border-primary hover:bg-primary/5 block h-full rounded-lg border p-4"
              >
                <h2 className="text-primary font-semibold" data-highlight>
                  {name}
                </h2>
                <CardDetails
                  sample={sample}
                  hasInternalId={hasInternalId}
                  extraFields={extraFields}
                />
              </Link>
            </li>
          );
        }
        const isSelected = igsn === selectedIgsn;
        return (
          <li
            key={igsn}
            id={sampleCardId(igsn)}
            className={`hover:border-primary hover:bg-primary/5 relative scroll-my-3 rounded-lg border p-4 ${isSelected ? "border-secondary bg-secondary/5 ring-secondary/60 ring-4" : ""}`}
            {...hoverHandlers}
          >
            <h2 className="text-primary pe-8 font-semibold">
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
            <CardDetails
              sample={sample}
              hasInternalId={hasInternalId}
              extraFields={extraFields}
            />
            <ViewSampleLink igsn={igsn} />
          </li>
        );
      })}
    </ul>
  );
}
