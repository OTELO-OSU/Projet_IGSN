import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Combobox,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import {
  facetParamKeys,
  SAMPLE_FACETS,
} from "@projet-igsn/domain/sample/search/facets";
import { type ReactNode, useId, useState } from "react";

import { HierarchyFacet } from "#/domain/samples/facet-hierarchy.tsx";
import { facetLabel, facetValueLabel } from "#/domain/samples/facet-labels.ts";
import { numericUnitLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

// The current facet selections, keyed by API query param (from the registry).
export type FacetValues = Record<string, string | number | undefined>;

// The sidebar's visual grouping of facets into sections (design-driven, so it
// lives here, not in the domain registry). Each facet key appears in exactly one
// section; the sample-facets.spec drift-guard fails if the registry gains a key
// that no section lists, so nothing silently disappears from the sidebar.
export const FACET_SECTIONS: readonly {
  title: () => string;
  keys: readonly string[];
}[] = [
  { title: m.facet_section_classification, keys: ["type", "nature"] },
  {
    title: m.facet_section_type,
    keys: ["material", "texture", "collectionMethod"],
  },
  {
    title: m.facet_section_author,
    keys: [
      "researchProgramName",
      "researchProgramChief",
      "researchCampaign",
      "collectorName",
      "collectionCurator",
    ],
  },
  { title: m.sample_section_age, keys: ["age"] },
];

type SampleFacetsProps = {
  values: FacetValues;
  // Set one facet param; an undefined value clears it. The caller writes it to
  // the URL and resets pagination.
  onChange: (key: string, value: string | number | undefined) => void;
  onClearAll: () => void;
};

// The faceted-filter sidebar. Presentational: it reads the current selections
// and reports changes; the route owns the URL and the results query. Each facet
// renders the control its kind calls for, driven by the facet registry so the
// set stays configurable in one place.
export function SampleFacets({
  values,
  onChange,
  onClearAll,
}: SampleFacetsProps) {
  // Uncontrolled text/number inputs seed from the URL on mount; bumping this key
  // on "clear all" remounts them empty (the comboboxes reset from the URL).
  const [resetNonce, setResetNonce] = useState(0);
  const hasActive = facetParamKeys().some((key) => values[key] !== undefined);

  const byKey = new Map(SAMPLE_FACETS.map((facet) => [facet.key, facet]));

  function renderFacet(facet: (typeof SAMPLE_FACETS)[number]): ReactNode {
    const label = facetLabel(facet.key);
    switch (facet.kind) {
      case "hierarchy":
        return (
          <HierarchyFacet
            key={facet.key}
            hierarchy={facet.hierarchy}
            translate={facetValueLabel(facet.key)}
            rootLabel={label}
            value={values[facet.key] as string | undefined}
            onChange={(value) => onChange(facet.key, value)}
            placeholder={m.facet_any()}
            searchPlaceholder={m.facet_search_placeholder()}
            emptyText={m.facet_empty()}
          />
        );
      case "enum":
        return (
          <EnumFacet
            key={facet.key}
            label={label}
            items={toComboboxItems(facet.values, facetValueLabel(facet.key))}
            value={values[facet.key] as string | undefined}
            onChange={(value) => onChange(facet.key, value)}
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
            label={label}
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

  return (
    <aside
      aria-label={m.facets_title()}
      className="sticky top-24 z-0 h-[calc(100vh-96px)] space-y-6 self-start overflow-y-auto py-6 pr-6"
    >
      <Button
        type="button"
        variant="outline"
        disabled={!hasActive}
        onClick={() => {
          onClearAll();
          setResetNonce((nonce) => nonce + 1);
        }}
      >
        {m.facets_clear_all()}
      </Button>

      <div className="divide-y">
        {FACET_SECTIONS.map((section) => (
          <FacetSection key={section.title()} title={section.title()}>
            {section.keys.map((key) => {
              const facet = byKey.get(key);
              return facet ? renderFacet(facet) : null;
            })}
          </FacetSection>
        ))}
      </div>
    </aside>
  );
}

// A titled group of facets: an uppercase section heading over its controls, with
// a divider from the previous section (via the parent `divide-y`).
function FacetSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-4 py-6 first:pt-0">
      <h2
        id={id}
        className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function EnumFacet({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        id={id}
        items={items}
        value={value ?? ""}
        onChange={(picked) => onChange(picked || undefined)}
        placeholder={m.facet_any()}
        searchPlaceholder={m.facet_search_placeholder()}
        emptyText={m.facet_empty()}
      />
    </div>
  );
}

function TextFacet({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <SearchField
        label={label}
        placeholder={label}
        defaultValue={value ?? ""}
        onSearch={(next) => onChange(next.trim() || undefined)}
      />
    </div>
  );
}

function RangeFacet({
  label,
  unitItems,
  min,
  max,
  unit,
  onChangeMin,
  onChangeMax,
  onChangeUnit,
}: {
  label: string;
  unitItems: { value: string; label: string }[];
  min: number | undefined;
  max: number | undefined;
  unit: string | undefined;
  onChangeMin: (value: number | undefined) => void;
  onChangeMax: (value: number | undefined) => void;
  onChangeUnit: (value: string | undefined) => void;
}) {
  const minId = useId();
  const maxId = useId();
  const unitId = useId();
  // Commit a bound on blur/Enter: parse the input, drop it when blank.
  const toBound = (raw: string): number | undefined =>
    raw.trim() === "" ? undefined : Number(raw);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={minId}>{m.facet_age_min()}</Label>
          <Input
            id={minId}
            type="number"
            defaultValue={min ?? ""}
            onBlur={(event) => onChangeMin(toBound(event.target.value))}
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor={maxId}>{m.facet_age_max()}</Label>
          <Input
            id={maxId}
            type="number"
            defaultValue={max ?? ""}
            onBlur={(event) => onChangeMax(toBound(event.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={unitId}>{m.facet_age_unit()}</Label>
        <Combobox
          id={unitId}
          items={unitItems}
          // Ma is the default scale (matching the query builder's default when
          // no unit is sent): the unit only scales the bounds, so there is no
          // "any unit" and clearing snaps back to "ma".
          value={unit ?? "ma"}
          onChange={(picked) => onChangeUnit(picked || undefined)}
          placeholder={m.facet_any()}
          searchPlaceholder={m.facet_search_placeholder()}
          emptyText={m.facet_empty()}
        />
      </div>
    </fieldset>
  );
}
