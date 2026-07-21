import type { ComboboxItem } from "../ui/combobox.tsx";

import { Label } from "../ui/label.tsx";
import { MultiCombobox } from "../ui/multi-combobox.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type MultiComboboxFieldProps = {
  label: string;
  items: ComboboxItem[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  removeLabel: (label: string) => string;
  disabled?: boolean;
};

// A multi-select autocomplete with chips, bound to a string-array field.
export function MultiComboboxField({
  label,
  ...combobox
}: MultiComboboxFieldProps) {
  const field = useFieldContext<string[]>();
  const { error, errorId, ariaProps } = useFieldError({ waitForTouch: true });
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <MultiCombobox
        id={field.name}
        values={field.state.value ?? []}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
        {...ariaProps}
        {...combobox}
      />
      <FieldError error={error} errorId={errorId} />
    </div>
  );
}
