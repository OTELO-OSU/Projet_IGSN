import { withRequired } from "../../lib/with-required.ts";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

// A date-only input (native picker, no dependency): the form store holds an
// ISO YYYY-MM-DD string, or undefined when blank, never a Date (no timezone).
export function DateField({
  label,
  requiredToPublish = false,
}: {
  label: string;
  requiredToPublish?: boolean;
}) {
  const field = useFieldContext<string | null | undefined>();
  const { error, errorId, ariaProps } = useFieldError();
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish)}
      </Label>
      <Input
        id={field.name}
        type="date"
        value={field.state.value ?? ""}
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
