import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { countryLabel } from "@projet-igsn/domain/sample/location/country-label";
import { oceanSeaName } from "@projet-igsn/domain/sample/location/ocean-sea-label";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { exactRanges, matchRanges } from "#/domain/samples/highlight-match.ts";
import { materialPathLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export type SampleListItem = Pick<
  Sample,
  "igsn" | "name" | "material" | "location" | "scientificContext"
>;

function locationText(location: Location | null): string {
  const region = location?.region;
  const regionName =
    region?.kind === "continent"
      ? region.country && countryLabel(region.country, getLocale())
      : region?.oceanSea && oceanSeaName(region.oceanSea);
  return [location?.localityName, regionName].filter(Boolean).join(", ");
}

// Registry name shared with the ::highlight() rule in styles.css.
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

const MATERIAL_BADGE_CLASS: Record<string, string> = {
  rock: "bg-amber-100 text-amber-900",
  sediment: "bg-sky-100 text-sky-900",
  mineral: "bg-purple-100 text-purple-900",
  fossil: "bg-orange-100 text-orange-900",
  synthetic_rock_mineral: "bg-teal-100 text-teal-900",
  extraterrestrial_rock: "bg-indigo-100 text-indigo-900",
};

export function SampleList({
  samples,
  query = "",
}: {
  samples: SampleListItem[];
  query?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);

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
      {samples.map(({ igsn, name, material, location, scientificContext }) => {
        // The public list only carries published samples, which always have an
        // igsn; skip any that somehow don't rather than link to a broken page.
        if (igsn === null) {
          return null;
        }
        const root = material?.split(".")[0];
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
              {place ? (
                <p className="text-muted-foreground mt-1 text-sm">{place}</p>
              ) : null}
              {collector ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  {m.sample_list_collector({ name: collector })}
                </p>
              ) : null}
              {root ? (
                <Badge className={`mt-2 ${MATERIAL_BADGE_CLASS[root] ?? ""}`}>
                  {materialPathLabel(root)}
                </Badge>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
