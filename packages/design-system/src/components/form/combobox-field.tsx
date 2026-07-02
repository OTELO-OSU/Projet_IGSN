import { Combobox, type ComboboxItem } from "../ui/combobox.tsx";
import { Label } from "../ui/label.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type ComboboxFieldProps = {
  label: string;
  items: ComboboxItem[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
};

export function ComboboxField({ label, ...combobox }: ComboboxFieldProps) {
  const field = useFieldContext<string>();
  const error = field.state.meta.errors[0];
  const errorId = `${field.name}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Combobox
        id={field.name}
        value={field.state.value}
        onChange={(value) => field.handleChange(value)}
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
