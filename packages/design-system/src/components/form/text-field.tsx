import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

export function TextField({
  label,
  multiline = false,
  number = false,
}: {
  label: string;
  multiline?: boolean;
  number?: boolean;
}) {
  const field = useFieldContext<string>();
  const error = field.state.meta.errors[0];
  const errorId = `${field.name}-error`;
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Control
        id={field.name}
        // The value stays a string (empty when blank) so the form draft never
        // holds NaN; callers parse on submit. step="any" allows decimals.
        {...(number ? { type: "number", step: "any" } : {})}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
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
