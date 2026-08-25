import type { ComboboxItem } from "../ui/combobox.tsx";

import { withRequired } from "../../lib/with-required.ts";
import { Label } from "../ui/label.tsx";
import { MultiCombobox } from "../ui/multi-combobox.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type MultiComboboxFieldProps = {
  label: string;
  items: ComboboxItem[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  removeLabel: (label: string) => string;
  onSearch?: (term: string) => void;
  lockedValues?: string[];
  disabled?: boolean;
  requiredToPublish?: boolean;
};

export function MultiComboboxField({
  label,
  requiredToPublish = false,
  disabled,
  ...combobox
}: MultiComboboxFieldProps) {
  const field = useFieldContext<string[]>();
  const { error, errorId, ariaProps } = useFieldError({ waitForTouch: true });
  const isDisabled = useFieldDisabled(disabled);
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish)}
      </Label>
      <MultiCombobox
        id={field.name}
        values={field.state.value ?? []}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
        disabled={isDisabled}
        {...ariaProps}
        {...combobox}
      />
      <FieldError error={error} errorId={errorId} />
    </div>
  );
}
