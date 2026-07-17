import { withRequired } from "../../lib/with-required.ts";
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
  requiredToPublish?: boolean;
};

export function ComboboxField({
  label,
  requiredToPublish = false,
  ...combobox
}: ComboboxFieldProps) {
  const field = useFieldContext<string | null | undefined>();
  // A change-sourced error waits for the touch, so a requirement triggered by
  // a sibling change (e.g. unit becomes required when an elevation is entered)
  // does not flash red before the user acts. A submit-sourced error always
  // shows: submitting IS the user acting, and a field unmounted at submit time
  // (on a hidden tab) is never marked touched, so gating it on the touch would
  // hide the very error that blocked the save.
  const error = field.state.meta.isTouched
    ? field.state.meta.errors[0]
    : field.state.meta.errorMap.onSubmit;
  const errorId = `${field.name}-error`;
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
