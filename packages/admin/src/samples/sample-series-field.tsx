import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { SampleSeries } from "@projet-igsn/domain/sample/series/model";

import { useFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { useFieldContext } from "@projet-igsn/design-system/components/form/form-hook-contexts";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { canJoinSeries } from "@projet-igsn/domain/sample/publication/can-join-series";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { samplePickerLabels } from "#/samples/sample-picker.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";
import { useSearchEligibleSeries } from "#/samples/use-search-eligible-series.ts";
import { SearchPicker } from "#/search-picker/search-picker.tsx";
import { usePicker } from "#/search-picker/use-picker.ts";

export function SampleSeriesField({
  storedSeries,
  status,
  hasParents,
}: {
  storedSeries: SampleSeries | null;
  status: SampleStatus;
  hasParents: boolean;
}) {
  const form = useSampleForm();
  return (
    <form.Subscribe
      selector={(state) => composeHierarchyValue(state.values.typePath)}
    >
      {(type) =>
        isVirtualSample(type) || hasParents ? null : (
          <FormSection title={m.section_series()}>
            {canJoinSeries({ status, type, parents: [] }) ? (
              <form.AppField name="seriesId">
                {() => <SeriesPicker storedSeries={storedSeries} />}
              </form.AppField>
            ) : (
              <p className="text-muted-foreground text-sm">
                {m.series_after_publication()}
              </p>
            )}
          </FormSection>
        )
      }
    </form.Subscribe>
  );
}

function SeriesPicker({ storedSeries }: { storedSeries: SampleSeries | null }) {
  const field = useFieldContext<string | null>();
  const [picked, setPicked] = useState(storedSeries);
  const isDisabled = useFieldDisabled();
  const picker = usePicker();
  const found = useSearchEligibleSeries(picker.search, {
    enabled: picker.isOpen,
  });
  return (
    <div className="grid gap-2 sm:max-w-96">
      <Label htmlFor="series">{m.field_series()}</Label>
      <SearchPicker
        id="series"
        {...samplePickerLabels()}
        value={picked?.id === field.state.value ? picked : null}
        picker={picker}
        found={found}
        disabled={isDisabled}
        onChange={(series) => {
          setPicked(series);
          field.handleChange(series?.id ?? null);
        }}
        placeholder={m.series_placeholder()}
        searchPlaceholder={m.series_search_placeholder()}
        emptyText={m.series_empty()}
        clearLabel={m.series_clear()}
      />
    </div>
  );
}
