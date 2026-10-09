import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { SampleSeries } from "@projet-igsn/domain/sample/series/model";

import { m } from "#/paraglide/messages.js";
import { useSearchEligibleParents } from "#/samples/use-search-eligible-parents.ts";
import { SearchPicker } from "#/search-picker/search-picker.tsx";
import { usePicker } from "#/search-picker/use-picker.ts";

export const sampleLabel = (sample: SampleSeries) =>
  sample.igsn === null ? sample.name : `${sample.name} (${sample.igsn})`;

export const samplePickerLabels = () => ({
  labelOf: (sample: SampleSeries) => sample.name,
  valueLabel: sampleLabel,
  detailOf: (sample: SampleSeries) => sample.igsn ?? "",
  suggestionsLabel: m.second_parent_suggestions_label(),
});

export function SamplePicker({
  onChange,
  exclude,
  childId,
  ...props
}: {
  id: string;
  value: SampleParent | null;
  onChange: (value: SampleParent | null) => void;
  placeholder: string;
  clearLabel?: string;
  exclude?: string;
  childId?: string;
  disabled?: boolean;
}) {
  const picker = usePicker();
  const found = useSearchEligibleParents(picker.search, exclude, {
    enabled: picker.isOpen,
    childId,
  });
  return (
    <SearchPicker
      {...props}
      {...samplePickerLabels()}
      picker={picker}
      found={found}
      onChange={onChange}
      searchPlaceholder={m.second_parent_search_placeholder()}
      emptyText={m.second_parent_empty()}
    />
  );
}
