import { Label } from "../ui/label.tsx";
import { Switch } from "../ui/switch.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

export function SwitchField({
  label,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
}) {
  const field = useFieldContext<boolean>();
  const { error, errorId, ariaProps } = useFieldError();
  const isDisabled = useFieldDisabled(disabled);
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Switch
          id={field.name}
          checked={field.state.value}
          disabled={isDisabled}
          onBlur={field.handleBlur}
          onCheckedChange={field.handleChange}
          {...ariaProps}
        />
        <Label htmlFor={field.name}>{label}</Label>
      </div>
      <FieldError error={error} errorId={errorId} />
    </div>
  );
}
