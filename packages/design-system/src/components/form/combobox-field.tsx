import { withRequired } from "../../lib/with-required.ts";
import { Combobox, type ComboboxItem } from "../ui/combobox.tsx";
import { Label } from "../ui/label.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type ComboboxFieldProps = {
  label: string;
  items: ComboboxItem[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  requiredToPublish?: boolean;
};

export function ComboboxField({
  label,
  requiredToPublish = false,
  ...combobox
}: ComboboxFieldProps) {
  const field = useFieldContext<string | null | undefined>();
  const { error, errorId, ariaProps } = useFieldError({ waitForTouch: true });
  return (
    <div className="grid gap-2">
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
        {...ariaProps}
        {...combobox}
      />
      <FieldError error={error} errorId={errorId} />
    </div>
  );
}
