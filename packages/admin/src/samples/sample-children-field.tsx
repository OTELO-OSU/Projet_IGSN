import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { FieldListRemoveButton } from "@projet-igsn/design-system/components/form/field-list-item";
import { useFieldContext } from "@projet-igsn/design-system/components/form/form-hook-contexts";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { sampleLabel, samplePickerLabels } from "#/samples/sample-picker.tsx";
import { useSampleForm } from "#/samples/use-sample-form.ts";
import { useSearchEligibleChildren } from "#/samples/use-search-eligible-children.ts";
import { SearchPicker } from "#/search-picker/search-picker.tsx";
import { usePicker } from "#/search-picker/use-picker.ts";

export function SampleChildrenField({
  sampleId,
  storedChildren = [],
  canSetChildren,
}: {
  sampleId: string | undefined;
  storedChildren?: SampleParent[];
  canSetChildren: boolean;
}) {
  const form = useSampleForm();
  return (
    <form.Subscribe
      selector={(state) => composeHierarchyValue(state.values.typePath)}
    >
      {(type) =>
        isVirtualSample(type) ? (
          <FormSection title={m.section_children()}>
            {canSetChildren ? (
              <form.AppField name="childIds" mode="array">
                {() => (
                  <ChildrenList
                    sampleId={sampleId}
                    storedChildren={storedChildren}
                  />
                )}
              </form.AppField>
            ) : (
              <p className="text-muted-foreground text-sm">
                {m.children_after_publication()}
              </p>
            )}
          </FormSection>
        ) : null
      }
    </form.Subscribe>
  );
}

type SeriesScope = { sampleId: string | undefined };

function ChildrenList({
  sampleId,
  storedChildren,
}: SeriesScope & { storedChildren: SampleParent[] }) {
  const field = useFieldContext<string[]>();
  const ids = field.state.value;
  const [known, setKnown] = useState(
    () => new Map(storedChildren.map((child) => [child.id, child])),
  );
  const remember = (child: SampleParent) =>
    setKnown((previous) => new Map(previous).set(child.id, child));

  return (
    <div className="grid gap-2 sm:max-w-96">
      {ids.map((id, index) => {
        const child = known.get(id) ?? null;
        const rowLabel = m.field_child({ index: index + 1 });
        return (
          <div key={id} className="flex items-center gap-1">
            <Label htmlFor={`child-${index}`} className="sr-only">
              {rowLabel}
            </Label>
            <ChildPicker
              id={`child-${index}`}
              value={child}
              excluded={ids}
              sampleId={sampleId}
              placeholder={m.children_placeholder()}
              onChange={(next) => {
                remember(next);
                field.replaceValue(index, next.id);
              }}
            />
            <FieldListRemoveButton
              label={m.child_detach({
                name: child ? sampleLabel(child) : rowLabel,
              })}
              onClick={() => field.removeValue(index)}
            />
          </div>
        );
      })}
      <Label htmlFor="child-new" className="sr-only">
        {m.child_add()}
      </Label>
      <ChildPicker
        id="child-new"
        value={null}
        excluded={ids}
        sampleId={sampleId}
        placeholder={m.child_add()}
        onChange={(next) => {
          remember(next);
          field.pushValue(next.id);
        }}
      />
    </div>
  );
}

function ChildPicker({
  sampleId,
  excluded,
  onChange,
  ...props
}: SeriesScope & {
  id: string;
  value: SampleParent | null;
  excluded: string[];
  placeholder: string;
  onChange: (child: SampleParent) => void;
}) {
  const picker = usePicker();
  const found = useSearchEligibleChildren(picker.search, sampleId, {
    enabled: picker.isOpen,
  });
  return (
    <SearchPicker
      {...props}
      {...samplePickerLabels()}
      picker={picker}
      found={{
        ...found,
        data: found.data?.filter((child) => !excluded.includes(child.id)),
      }}
      onChange={(child) => {
        if (child) onChange(child);
      }}
      searchPlaceholder={m.children_search_placeholder()}
      emptyText={m.children_empty()}
    />
  );
}
