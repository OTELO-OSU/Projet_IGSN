import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { useFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { SamplePicker } from "#/samples/sample-picker.tsx";

export function AddParentField({
  childId,
  parentIds,
  onChange,
}: {
  childId: string | undefined;
  parentIds: string[];
  onChange: (parentIds: string[]) => void;
}) {
  const [picked, setPicked] = useState<SampleParent | null>(null);
  const disabled = useFieldDisabled();
  return (
    <div className="grid w-full gap-2 sm:w-72">
      <Label htmlFor="add-parent">{m.field_parent()}</Label>
      <SamplePicker
        id="add-parent"
        value={picked && parentIds.includes(picked.id) ? picked : null}
        onChange={(parent) => {
          setPicked(parent);
          onChange(parent ? [parent.id] : []);
        }}
        childId={childId}
        placeholder={m.add_parent_placeholder()}
        clearLabel={m.no_parent()}
        disabled={disabled}
      />
    </div>
  );
}
