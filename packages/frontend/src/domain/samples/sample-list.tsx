import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import type { CardSample } from "#/domain/samples/card-fields.ts";

import {
  locationText,
  materialText,
  selectedCardFields,
  typeNatureText,
} from "#/domain/samples/card-fields.ts";
import { exactRanges, matchRanges } from "#/domain/samples/highlight-match.ts";
import { m } from "#/paraglide/messages.js";

const SEARCH_HIGHLIGHT = "sample-search-match";

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

export function SampleList({
  samples,
  query = "",
  fields,
}: {
  samples: CardSample[];
  query?: string;
  fields?: string[];
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
    <ul ref={listRef} className="grid gap-4 sm:grid-cols-2">
      {samples.map((sample) => {
        const { igsn, name, location, scientificContext } = sample;
        if (igsn === null) {
          return null;
        }
        const kind = typeNatureText(sample);
        const material = materialText(sample);
        const place = locationText(location);
        const collector = scientificContext?.collectorName;
        return (
          <li key={igsn}>
            <Link
              to="/samples/$igsn"
              params={{ igsn }}
              className="block rounded-lg border p-4 hover:border-sky-800 hover:bg-sky-50"
            >
              <h2 className="font-semibold text-sky-900" data-highlight>
                {name}
              </h2>
              <p
                className="text-muted-foreground mt-1 font-mono text-sm break-all"
                data-highlight="exact"
              >
                {igsn}
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
