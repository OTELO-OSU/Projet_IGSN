import type { ComboboxItem } from "@projet-igsn/design-system/components/ui/combobox";
import type { NumericUnit } from "@projet-igsn/domain/sample/age/numeric-unit";
import type { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { TruncatedText } from "@projet-igsn/design-system/components/ui/truncated-text";
import { XIcon } from "lucide-react";

import type { FacetValues } from "#/domain/samples/sample-facets.tsx";

import { facetLabel, facetValueLabel } from "#/domain/samples/facet-labels.ts";
import { numericUnitLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

type Facet = (typeof SAMPLE_FACETS)[number];
type FacetChip = { param: string; text: string };

function facetChips(
  facet: Facet,
  values: FacetValues,
  linkedItems: Record<string, ComboboxItem[]>,
): FacetChip[] {
  const label = facetLabel(facet.key);
  if (facet.kind === "numericRange") {
    const unit = numericUnitLabel(
      (values[`${facet.key}Unit`] as NumericUnit | undefined) ?? "ma",
    );
    const bound = (param: string, chip: typeof m.facet_chip_min) => {
      const value = values[param];
      return value === undefined
        ? []
        : [{ param, text: chip({ label, value: `${value} ${unit}` }) }];
    };
    return [
      ...bound(`${facet.key}Min`, m.facet_chip_min),
      ...bound(`${facet.key}Max`, m.facet_chip_max),
    ];
  }
  const value = values[facet.key];
  if (value === undefined) return [];
  if (facet.kind === "boolean") return [{ param: facet.key, text: label }];
  const code = String(value);
  const valueText =
    facet.kind === "linked"
      ? (linkedItems[facet.key]?.find((item) => item.value === code)?.label ??
        code)
      : facetValueLabel(facet.key)(code);
  return [
    { param: facet.key, text: m.facet_chip({ label, value: valueText }) },
  ];
}

export function ActiveFacetChips({
  facets,
  values,
  linkedItems,
  onRemove,
  onClearAll,
}: {
  facets: readonly Facet[];
  values: FacetValues;
  linkedItems: Record<string, ComboboxItem[]>;
  onRemove: (param: string) => void;
  onClearAll: () => void;
}) {
  const chips = facets.flatMap((facet) =>
    facetChips(facet, values, linkedItems),
  );
  if (chips.length === 0) return null;
  return (
    <ul aria-label={m.facets_active()} className="flex flex-wrap gap-2">
      {chips.map(({ param, text }) => (
        <li key={param} className="max-w-full min-w-0">
          <Badge
            variant="secondary"
            className="max-w-full min-w-0 gap-1.5 py-1 pr-1.5 pl-2.5 text-sm"
          >
            <TruncatedText>{text}</TruncatedText>
            <button
              type="button"
              aria-label={m.facet_chip_remove({ label: text })}
              onClick={() => onRemove(param)}
              className="hover:bg-foreground/10 shrink-0 rounded-full"
            >
              <XIcon className="size-3.5" />
            </button>
          </Badge>
        </li>
      ))}
      <li>
        <Button
          type="button"
          variant="secondary"
          className="h-auto rounded-full px-2.5 py-1 text-sm"
          onClick={onClearAll}
        >
          {m.facets_clear_all()}
        </Button>
      </li>
    </ul>
  );
}
