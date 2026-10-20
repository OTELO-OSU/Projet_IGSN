import type { ComboboxItem } from "@projet-igsn/design-system/components/ui/combobox";
import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleFacetCounts } from "@projet-igsn/domain/sample/sample-validator";
import type { PublicUser } from "@projet-igsn/domain/user/user-validator";

import { Accordion } from "@projet-igsn/design-system/components/ui/accordion";
import { allowsMineralClassifications } from "@projet-igsn/domain/sample/mineral/allows-mineral-classifications";
import {
  activeFacetKeys,
  SAMPLE_FACETS,
} from "@projet-igsn/domain/sample/search/facets";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { type ReactNode, useState } from "react";

import type { FacetValues } from "#/domain/samples/facet-values.ts";

import { ActiveFacetChips } from "#/domain/samples/active-facet-chips.tsx";
import { FacetField } from "#/domain/samples/facet-field.tsx";
import { FacetSection } from "#/domain/samples/facet-section.tsx";
import { FACET_SECTIONS } from "#/domain/samples/facet-sections.ts";
import { m } from "#/paraglide/messages.js";

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
  header?: ReactNode;
};

export function SampleFacets({
  values,
  onChange,
  onClearAll,
  manualGroups = [],
  contributors = [],
  counts,
  header,
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

  return (
    <aside
      aria-label={m.facets_title()}
      className="space-y-6 border-b py-6 lg:sticky lg:top-36 lg:z-0 lg:h-[calc(100vh-144px)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-b-0 lg:pr-6"
    >
      {header}
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
              return facet ? (
                <FacetField
                  key={key}
                  facet={facet}
                  values={values}
                  onChange={onChange}
                  counts={counts}
                  fetchedItems={fetchedItems}
                  resetNonce={resetNonce}
                />
              ) : null;
            })}
          </FacetSection>
        ))}
      </Accordion>
    </aside>
  );
}
