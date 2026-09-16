import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { m } from "#/paraglide/messages.js";
import { useSearchEligibleParents } from "#/samples/use-search-eligible-parents.ts";
import { SearchPicker } from "#/search-picker/search-picker.tsx";
import { usePicker } from "#/search-picker/use-picker.ts";

export function SamplePicker({
  onChange,
  exclude,
  ...props
}: {
  id: string;
  value: SampleParent | null;
  onChange: (value: SampleParent | null) => void;
  placeholder: string;
  clearLabel?: string;
  exclude?: string;
}) {
  const picker = usePicker();
  const found = useSearchEligibleParents(picker.search, exclude, {
    enabled: picker.isOpen,
  });
  return (
    <SearchPicker
      {...props}
      picker={picker}
      found={found}
      onChange={onChange}
      labelOf={(sample) => sample.name}
      valueLabel={(sample) => `${sample.name} (${sample.igsn})`}
      detailOf={(sample) => sample.igsn}
      searchPlaceholder={m.second_parent_search_placeholder()}
      suggestionsLabel={m.second_parent_suggestions_label()}
      emptyText={m.second_parent_empty()}
    />
  );
}
