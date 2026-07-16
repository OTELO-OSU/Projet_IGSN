import { Combobox, type ComboboxItem } from "../ui/combobox.tsx";
import { Label } from "../ui/label.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type ComboboxFieldProps = {
  label: string;
  items: ComboboxItem[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
};

export function ComboboxField({ label, ...combobox }: ComboboxFieldProps) {
  const field = useFieldContext<string | null | undefined>();
  // Only surface an error once the user has touched the field, so a requirement
  // triggered by a sibling change (e.g. unit becomes required when an elevation
  // is entered) does not flash red before they act. Submitting marks every field
  // touched, so the error still shows on a save attempt.
  const error = field.state.meta.isTouched
    ? field.state.meta.errors[0]
    : undefined;
  const errorId = `${field.name}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Combobox
        id={field.name}
        // The Combobox primitive speaks "" for "no selection"; the form store
        // holds nullish for it, never an empty string.
        value={field.state.value ?? ""}
        onChange={(value) => field.handleChange(value || undefined)}
        onBlur={field.handleBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...combobox}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
