import { Checkbox } from "../ui/checkbox.tsx";
import { Label } from "../ui/label.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type CheckboxGroupItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

// A checkbox multi-select bound to a string-array field. The stored array
// follows the items order, so a selection reads back deterministically.
// Per-item `disabled` lets callers express dependencies between choices (e.g.
// an exclusive "none" entry) without the group knowing the rule.
export function CheckboxGroupField({
  label,
  items,
}: {
  label: string;
  items: CheckboxGroupItem[];
}) {
  const field = useFieldContext<string[]>();
  // The group splits the aria wiring: the description sits on the fieldset,
  // the invalid flag on each checkbox.
  const { error, errorId } = useFieldError();
  const checked = field.state.value ?? [];
  const toggle = (value: string, on: boolean) =>
    field.handleChange(
      on
        ? items
            .map((item) => item.value)
            .filter((v) => v === value || checked.includes(v))
        : checked.filter((v) => v !== value),
    );
  return (
    <fieldset
      className="grid gap-2"
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="mb-2 text-sm leading-none font-medium">{label}</legend>
      {items.map((item) => (
        <div key={item.value} className="flex items-center gap-2">
          <Checkbox
            id={`${field.name}-${item.value}`}
            checked={checked.includes(item.value)}
            disabled={item.disabled}
            onBlur={field.handleBlur}
            onCheckedChange={(state) => toggle(item.value, state === true)}
            aria-invalid={error ? true : undefined}
          />
          <Label htmlFor={`${field.name}-${item.value}`}>{item.label}</Label>
        </div>
      ))}
      <FieldError error={error} errorId={errorId} />
    </fieldset>
  );
}
