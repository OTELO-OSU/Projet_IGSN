import type { SampleFacetCounts } from "@projet-igsn/domain/sample/sample-validator";
import type { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import type { ReactNode } from "react";

import {
  type ComboboxItem,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";

import type { FacetValues } from "#/domain/samples/facet-values.ts";

import { BooleanFacet } from "#/domain/samples/facet-boolean.tsx";
import { EnumFacet } from "#/domain/samples/facet-enum.tsx";
import { HierarchyFacet } from "#/domain/samples/facet-hierarchy.tsx";
import { withCounts, withSelected } from "#/domain/samples/facet-items.ts";
import { facetLabel, facetValueLabel } from "#/domain/samples/facet-labels.ts";
import { NARROWED_VALUES } from "#/domain/samples/facet-narrowed-values.ts";
import { RangeFacet } from "#/domain/samples/facet-range.tsx";
import { TextFacet } from "#/domain/samples/facet-text.tsx";
import { numericUnitLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export function FacetField({
  facet,
  values,
  onChange,
  counts,
  fetchedItems,
  resetNonce,
}: {
  facet: (typeof SAMPLE_FACETS)[number];
  values: FacetValues;
  onChange: (
    key: string,
    value: string | number | boolean | undefined,
  ) => void | Promise<void>;
  counts?: SampleFacetCounts;
  fetchedItems: Record<string, ComboboxItem[]>;
  resetNonce: number;
}): ReactNode {
  const countsOf = (key: string) => counts && (counts[key] ?? {});
  const label = facetLabel(facet.key);
  switch (facet.kind) {
    case "hierarchy":
      return (
        <HierarchyFacet
          key={facet.key}
          hierarchy={facet.hierarchy}
          counts={countsOf(facet.key)}
          translate={facetValueLabel(facet.key)}
          label={label}
          value={values[facet.key] as string | undefined}
          onChange={(value) => onChange(facet.key, value)}
          placeholder={m.facet_any()}
          searchPlaceholder={m.facet_search_placeholder()}
          emptyText={m.facet_empty()}
        />
      );
    case "enum":
    case "linked": {
      const selected = values[facet.key] as string | undefined;
      const items = withSelected(
        withCounts(
          facet.kind === "enum"
            ? toComboboxItems(
                NARROWED_VALUES[facet.key]?.(values) ?? facet.values,
                facetValueLabel(facet.key),
              )
            : (fetchedItems[facet.key] ?? []),
          countsOf(facet.key),
          selected,
        ),
        selected,
        facetValueLabel(facet.key),
      );
      return (
        <EnumFacet
          key={facet.key}
          label={label}
          items={items}
          value={selected}
          onChange={(value) => onChange(facet.key, value)}
          disabled={items.length === 0}
        />
      );
    }
    case "boolean":
      return (
        <BooleanFacet
          key={facet.key}
          label={label}
          checked={values[facet.key] === true}
          onChange={(checked) => onChange(facet.key, checked || undefined)}
        />
      );
    case "text":
      return (
        <TextFacet
          key={`${facet.key}-${resetNonce}`}
          label={label}
          value={values[facet.key] as string | undefined}
          onChange={(value) => onChange(facet.key, value)}
        />
      );
    case "numericRange":
      return (
        <RangeFacet
          key={`${facet.key}-${resetNonce}`}
          unitItems={toComboboxItems(facet.units, numericUnitLabel)}
          min={values[`${facet.key}Min`] as number | undefined}
          max={values[`${facet.key}Max`] as number | undefined}
          unit={values[`${facet.key}Unit`] as string | undefined}
          onChangeMin={(value) => onChange(`${facet.key}Min`, value)}
          onChangeMax={(value) => onChange(`${facet.key}Max`, value)}
          onChangeUnit={(value) => onChange(`${facet.key}Unit`, value)}
        />
      );
  }
}
