import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import {
  Combobox,
  toComboboxItems,
} from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { hierarchyPathLabel } from "@projet-igsn/design-system/lib/hierarchy";
import { COLLECTION_METHOD_HIERARCHY } from "@projet-igsn/domain/sample/collection-method/vocabulary";
import { AVAILABILITY_STATUSES } from "@projet-igsn/domain/sample/curation/availability-status";
import { EXISTENCE_STATUSES } from "@projet-igsn/domain/sample/curation/existence-status";
import { NATURES } from "@projet-igsn/domain/sample/nature";
import { sampleStatusSchema } from "@projet-igsn/domain/sample/sample";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";

import type { FilterEntry } from "#/filters/list-header.tsx";

import { searchFilterEntry } from "#/filters/search-filter-entry.tsx";
import { selectFilterEntry } from "#/filters/select-filter-entry.tsx";
import { TreeFilter } from "#/filters/tree-filter.tsx";
import { m } from "#/paraglide/messages.js";
import { COLLECTION_METHOD_TREE } from "#/samples/collection-method-tree-nodes.ts";
import {
  availabilityStatusLabel,
  collectionMethodLabel,
  existenceStatusLabel,
  natureLabel,
} from "#/samples/sample-labels.ts";
import { SAMPLE_STATUS } from "#/samples/sample-status-badge.tsx";

type SampleFilterValues = Pick<
  ListSamplesQuery,
  | "nature"
  | "collectionMethod"
  | "collectorName"
  | "status"
  | "existenceStatus"
  | "availabilityStatus"
>;

const NATURE_ITEMS = toComboboxItems(NATURES, natureLabel);
const STATUS_ITEMS = toComboboxItems(sampleStatusSchema.options, (value) =>
  SAMPLE_STATUS[value].label(),
);
const EXISTENCE_STATUS_ITEMS = toComboboxItems(
  EXISTENCE_STATUSES,
  existenceStatusLabel,
);
const AVAILABILITY_STATUS_ITEMS = toComboboxItems(
  AVAILABILITY_STATUSES,
  availabilityStatusLabel,
);

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
    selectFilterEntry({
      name: "status",
      label: m.column_status(),
      anyLabel: m.samples_status_all(),
      items: STATUS_ITEMS,
      value: values.status,
      parse: (next) => listSamplesQuerySchema.shape.status.parse(next),
      onChange: (status) => onChange({ status }),
    }),
    searchFilterEntry({
      name: "collectorName",
      label: m.field_collector_name(),
      placeholder: m.filter_collector_name_placeholder(),
      defaultValue: values.collectorName,
      onRemove: () => onChange({ collectorName: undefined }),
      onSearch: (value) => onChange({ collectorName: value || undefined }),
    }),
    selectFilterEntry({
      name: "existenceStatus",
      label: m.field_existence_status(),
      anyLabel: m.filter_existence_status_any(),
      items: EXISTENCE_STATUS_ITEMS,
      value: values.existenceStatus,
      parse: (next) => listSamplesQuerySchema.shape.existenceStatus.parse(next),
      onChange: (existenceStatus) => onChange({ existenceStatus }),
    }),
    selectFilterEntry({
      name: "availabilityStatus",
      label: m.field_availability_status(),
      anyLabel: m.filter_availability_status_any(),
      items: AVAILABILITY_STATUS_ITEMS,
      value: values.availabilityStatus,
      parse: (next) =>
        listSamplesQuerySchema.shape.availabilityStatus.parse(next),
      onChange: (availabilityStatus) => onChange({ availabilityStatus }),
    }),
  ];
}
