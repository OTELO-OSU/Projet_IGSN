import { withRequired } from "../../lib/with-required.ts";
import {
  Combobox,
  type ComboboxItem,
  comboboxItemFormat,
} from "../ui/combobox.tsx";
import { Label } from "../ui/label.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { FieldRow } from "./field-row.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type ComboboxFieldProps = {
  label: string;
  items: ComboboxItem[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  clearable?: boolean;
  requiredToPublish?: boolean;
};

export function ComboboxField({
  label,
  items,
  requiredToPublish = false,
  disabled,
  ...combobox
}: ComboboxFieldProps) {
  const field = useFieldContext<string | null | undefined>();
  const { error, errorId, ariaProps } = useFieldError({ waitForTouch: true });
  const isDisabled = useFieldDisabled(disabled);
  return (
    <FieldRow format={comboboxItemFormat(items)}>
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish)}
      </Label>
      <Combobox
        id={field.name}
        // The Combobox primitive speaks "" for "no selection"; the form store
        // holds nullish for it, never an empty string.
        value={field.state.value ?? ""}
        onChange={(value) => field.handleChange(value || undefined)}
        onBlur={field.handleBlur}
        disabled={isDisabled}
        items={items}
        {...ariaProps}
        {...combobox}
      />
      <FieldError error={error} errorId={errorId} />
    </FieldRow>
  );
}
