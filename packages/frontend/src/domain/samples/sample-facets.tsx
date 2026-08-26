import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { PublicUser } from "@projet-igsn/domain/user/user-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Combobox,
  type ComboboxItem,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import {
  facetParamKeys,
  SAMPLE_FACETS,
} from "@projet-igsn/domain/sample/search/facets";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { type ReactNode, useId, useState } from "react";

import { HierarchyFacet } from "#/domain/samples/facet-hierarchy.tsx";
import { facetLabel, facetValueLabel } from "#/domain/samples/facet-labels.ts";
import { numericUnitLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export type FacetValues = Record<string, string | number | undefined>;

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
      "contributor",
      "researchProgramName",
      "researchProgramChief",
      "researchCampaign",
      "collectorName",
      "collectionCurator",
    ],
  },
  { title: m.sample_section_age, keys: ["age"] },
  {
    title: m.sample_section_institution,
    keys: [
      "institutionalOrganization",
      "institutionalOsu",
      "institutionalLaboratory",
      "manualGroup",
    ],
  },
];

const organizationOf = (values: FacetValues) =>
  values.institutionalOrganization as string | undefined;

const NARROWED_VALUES: Record<
  string,
  (values: FacetValues) => readonly string[]
> = {
  institutionalOsu: (values) => {
    const organizationRor = organizationOf(values);
    return organizationRor
      ? filterOsusByOrg(organizationRor).map((osu) => osu.code)
      : [];
  },
  institutionalLaboratory: (values) => {
    const organizationRor = organizationOf(values);
    return organizationRor
      ? filterLaboratoriesByOrgAndOsu({
          organizationRor,
          osu: values.institutionalOsu as string | undefined,
        }).map((laboratory) => laboratory.code)
      : [];
  },
};

function withSelected(
  items: { value: string; label: string }[],
  selected: string | undefined,
  label: (code: string) => string,
): { value: string; label: string }[] {
  return selected && !items.some((item) => item.value === selected)
    ? [...items, { value: selected, label: label(selected) }]
    : items;
}

type SampleFacetsProps = {
  values: FacetValues;
  onChange: (key: string, value: string | number | undefined) => void;
  onClearAll: () => void;
  manualGroups?: ManualGroup[];
  contributors?: PublicUser[];
};

export function SampleFacets({
  values,
  onChange,
  onClearAll,
  manualGroups = [],
  contributors = [],
}: SampleFacetsProps) {
  const [resetNonce, setResetNonce] = useState(0);
  const hasActive = facetParamKeys().some((key) => values[key] !== undefined);

  const byKey = new Map(SAMPLE_FACETS.map((facet) => [facet.key, facet]));
  const fetchedItems: Record<string, ComboboxItem[]> = {
    manualGroup: manualGroups.map((group) => ({
      value: group.id,
      label: group.name,
    })),
    contributor: contributors.map((user) => ({
      value: user.id,
      label: fullName(user),
    })),
  };

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
      case "linked": {
        const selected = values[facet.key] as string | undefined;
        const items = withSelected(
          facet.kind === "enum"
            ? toComboboxItems(
                NARROWED_VALUES[facet.key]?.(values) ?? facet.values,
                facetValueLabel(facet.key),
              )
            : (fetchedItems[facet.key] ?? []),
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

  return (
    <aside
      aria-label={m.facets_title()}
      className="space-y-6 py-6 md:sticky md:top-24 md:z-0 md:h-[calc(100vh-96px)] md:self-start md:overflow-y-auto md:pr-6"
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
  disabled,
}: {
  label: string;
  items: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
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
        disabled={disabled}
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
  unitItems,
  min,
  max,
  unit,
  onChangeMin,
  onChangeMax,
  onChangeUnit,
}: {
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
  const toBound = (raw: string): number | undefined =>
    raw.trim() === "" ? undefined : Number(raw);

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-1">
        <Label htmlFor={minId}>{m.facet_age_min()}</Label>
        <Input
          id={minId}
          type="number"
          defaultValue={min ?? ""}
          onBlur={(event) => onChangeMin(toBound(event.target.value))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={maxId}>{m.facet_age_max()}</Label>
        <Input
          id={maxId}
          type="number"
          defaultValue={max ?? ""}
          onBlur={(event) => onChangeMax(toBound(event.target.value))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={unitId}>{m.facet_age_unit()}</Label>
        <Combobox
          id={unitId}
          items={unitItems}
          value={unit ?? "ma"}
          onChange={(picked) => onChangeUnit(picked || undefined)}
          placeholder={m.facet_any()}
          searchPlaceholder={m.facet_search_placeholder()}
          emptyText={m.facet_empty()}
        />
      </div>
    </div>
  );
}
