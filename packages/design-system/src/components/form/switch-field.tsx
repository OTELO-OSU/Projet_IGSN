import { Label } from "../ui/label.tsx";
import { Switch } from "../ui/switch.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { FieldRow } from "./field-row.tsx";
import { useFieldSuggestionRule } from "./field-suggestion-context.tsx";
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
  const { booleanLabel } = useFieldSuggestionRule();
  return (
    <FieldRow format={(value) => booleanLabel(Boolean(value))}>
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
    </FieldRow>
  );
}
