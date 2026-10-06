import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleFacetCounts } from "@projet-igsn/domain/sample/sample-validator";
import type { PublicUser } from "@projet-igsn/domain/user/user-validator";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@projet-igsn/design-system/components/ui/accordion";
import {
  Combobox,
  type ComboboxItem,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { filterLaboratoriesByOrgAndOsu } from "@projet-igsn/domain/institutional-group/filter-laboratories-by-org-and-osu";
import { filterOsusByOrg } from "@projet-igsn/domain/institutional-group/filter-osus-by-org";
import { allowsMineralClassifications } from "@projet-igsn/domain/sample/mineral/allows-mineral-classifications";
import {
  activeFacetKeys,
  SAMPLE_FACETS,
} from "@projet-igsn/domain/sample/search/facets";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { type ReactNode, useId, useState } from "react";

import { ActiveFacetChips } from "#/domain/samples/active-facet-chips.tsx";
import { HierarchyFacet } from "#/domain/samples/facet-hierarchy.tsx";
import { facetLabel, facetValueLabel } from "#/domain/samples/facet-labels.ts";
import { numericUnitLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export type FacetValues = Record<string, string | number | boolean | undefined>;

export const FACET_SECTIONS: readonly {
  title: () => string;
  keys: readonly string[];
}[] = [
  {
    title: m.sample_section_identity,
    keys: ["includeSubSamples", "type", "nature", "collectionMethod"],
  },
  {
    title: m.sample_section_classification,
    keys: ["material", "mineralClassification"],
  },
  { title: m.sample_section_age, keys: ["age"] },
  {
    title: m.sample_section_scientific_context,
    keys: [
      "collectorName",
      "chiefScientist",
      "hostInstitution",
      "researchProgramName",
    ],
  },
  {
    title: m.sample_section_declaration,
    keys: [
      "contributor",
      "manualGroup",
      "institutionalOrganization",
      "institutionalOsu",
      "institutionalLaboratory",
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

function withCounts(
  items: ComboboxItem[],
  counts: Record<string, number> | undefined,
  selected: string | undefined,
): ComboboxItem[] {
  if (!counts) return items;
  return items.flatMap((item) => {
    const count = counts[item.value] ?? 0;
    if (count > 0) return [{ ...item, label: `${item.label} (${count})` }];
    return item.value === selected ? [item] : [];
  });
}

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
  onChange: (
    key: string,
    value: string | number | boolean | undefined,
  ) => void | Promise<void>;
  onClearAll: () => void | Promise<void>;
  manualGroups?: ManualGroup[];
  contributors?: PublicUser[];
  counts?: SampleFacetCounts;
};

export function SampleFacets({
  values,
  onChange,
  onClearAll,
  manualGroups = [],
  contributors = [],
  counts,
}: SampleFacetsProps) {
  const [resetNonce, setResetNonce] = useState(0);
  const activeKeys = activeFacetKeys(values);
  const isSectionActive = (keys: readonly string[]) =>
    keys.some((key) =>
      [key, `${key}Min`, `${key}Max`].some((param) =>
        activeKeys.includes(param),
      ),
    );
  const resetUncontrolledFacets = () => setResetNonce((nonce) => nonce + 1);

  const countsOf = (key: string) => counts && (counts[key] ?? {});
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

  return (
    <aside
      aria-label={m.facets_title()}
      className="space-y-6 border-b py-6 md:sticky md:top-24 md:z-0 md:h-[calc(100vh-96px)] md:self-start md:overflow-y-auto md:border-r md:border-b-0 md:pr-6"
    >
      <ActiveFacetChips
        facets={FACET_SECTIONS.flatMap((section) => section.keys).flatMap(
          (key) => byKey.get(key) ?? [],
        )}
        values={values}
        linkedItems={fetchedItems}
        onRemove={async (param) => {
          await onChange(param, undefined);
          resetUncontrolledFacets();
        }}
        onClearAll={async () => {
          await onClearAll();
          resetUncontrolledFacets();
        }}
      />

      <Accordion
        type="multiple"
        defaultValue={FACET_SECTIONS.filter(
          (section, index) => index === 0 || isSectionActive(section.keys),
        ).map((section) => section.title())}
      >
        {FACET_SECTIONS.map((section) => (
          <FacetSection key={section.title()} title={section.title()}>
            {section.keys.map((key) => {
              const facet = byKey.get(key);
              if (
                key === "mineralClassification" &&
                !allowsMineralClassifications(
                  values.material as string | undefined,
                )
              ) {
                return null;
              }
              return facet ? renderFacet(facet) : null;
            })}
          </FacetSection>
        ))}
      </Accordion>
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
  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-muted-foreground items-center py-6 text-xs font-semibold tracking-wide uppercase">
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-6">{children}</AccordionContent>
    </AccordionItem>
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

function BooleanFacet({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
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
      <div className="grid grid-cols-2 gap-2">
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
