import { withRequired } from "../../lib/with-required.ts";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
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
  const error = field.state.meta.errors[0];
  const errorId = `${field.name}-error`;
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
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
