import { withRequired } from "../../lib/with-required.ts";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

export function DateField({
  label,
  requiredToPublish = false,
  disabled = false,
  withTime = false,
}: {
  label: string;
  requiredToPublish?: boolean;
  disabled?: boolean;
  withTime?: boolean;
}) {
  const field = useFieldContext<string | null | undefined>();
  const { error, errorId, ariaProps } = useFieldError();
  const isDisabled = useFieldDisabled(disabled);
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish)}
      </Label>
      <Input
        id={field.name}
        type={withTime ? "datetime-local" : "date"}
        value={field.state.value ?? ""}
        disabled={isDisabled}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(event.target.value || undefined)
        }
        {...ariaProps}
      />
      <FieldError error={error} errorId={errorId} />
    </div>
  );
}
