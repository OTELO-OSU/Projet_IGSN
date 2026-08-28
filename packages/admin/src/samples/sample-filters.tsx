import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { hierarchyPathLabel } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import {
  Combobox,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { COLLECTION_METHOD_HIERARCHY } from "@projet-igsn/domain/sample/collection-method/vocabulary";
import { NATURES } from "@projet-igsn/domain/sample/nature";
import { sampleStatusSchema } from "@projet-igsn/domain/sample/sample";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";

import type { FilterEntry } from "#/filters/list-header.tsx";

import { SelectFilter } from "#/filters/select-filter.tsx";
import { TreeFilter } from "#/filters/tree-filter.tsx";
import { m } from "#/paraglide/messages.js";
import { COLLECTION_METHOD_TREE } from "#/samples/collection-method-tree-nodes.ts";
import { collectionMethodLabel, natureLabel } from "#/samples/sample-labels.ts";
import { SAMPLE_STATUS } from "#/samples/sample-status-badge.tsx";

type SampleFilterValues = Pick<
  ListSamplesQuery,
  "nature" | "collectionMethod" | "status"
>;

const NATURE_ITEMS = toComboboxItems(NATURES, natureLabel);

export function sampleFilterEntries({
  values,
  onChange,
}: {
  values: SampleFilterValues;
  onChange: (next: Partial<SampleFilterValues>) => void;
}): FilterEntry[] {
  return [
    {
      name: "nature",
      label: m.field_nature(),
      active: values.nature !== undefined,
      onRemove: () => onChange({ nature: undefined }),
      cell: (
        <>
          <Label htmlFor="nature-filter">{m.field_nature()}</Label>
          <Combobox
            id="nature-filter"
            items={NATURE_ITEMS}
            value={values.nature ?? ""}
            onChange={(next) =>
              onChange({
                nature: listSamplesQuerySchema.shape.nature.parse(next),
              })
            }
            placeholder={m.nature_placeholder()}
            searchPlaceholder={m.nature_search_placeholder()}
            emptyText={m.nature_empty()}
          />
        </>
      ),
    },
    {
      name: "collectionMethod",
      label: m.field_collection_method(),
      active: values.collectionMethod !== undefined,
      onRemove: () => onChange({ collectionMethod: undefined }),
      cell: (
        <>
          <Label htmlFor="collection-method-filter">
            {m.field_collection_method()}
          </Label>
          <TreeFilter
            id="collection-method-filter"
            nodes={COLLECTION_METHOD_TREE}
            value={values.collectionMethod}
            onChange={(next) => onChange({ collectionMethod: next })}
            selectedLabel={
              values.collectionMethod &&
              hierarchyPathLabel(
                COLLECTION_METHOD_HIERARCHY,
                values.collectionMethod,
                collectionMethodLabel,
              )
            }
            anyLabel={m.filter_collection_method_any()}
            searchLabel={m.filter_collection_method_search()}
            emptyText={m.collection_method_empty()}
          />
        </>
      ),
    },
    {
      name: "status",
      label: m.column_status(),
      active: values.status !== undefined,
      onRemove: () => onChange({ status: undefined }),
      cell: (
        <SelectFilter
          id="status-filter"
          label={m.column_status()}
          anyLabel={m.samples_status_all()}
          items={sampleStatusSchema.options.map((value) => ({
            value,
            label: SAMPLE_STATUS[value].label(),
          }))}
          value={values.status}
          onChange={(next) =>
            onChange({
              status: listSamplesQuerySchema.shape.status.parse(next),
            })
          }
        />
      ),
    },
  ];
}
