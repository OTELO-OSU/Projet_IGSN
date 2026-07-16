import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

// Blank or partial numeric input reads as undefined, never NaN.
const toNumber = (text: string): number | undefined => {
  const value = Number(text);
  return text === "" || Number.isNaN(value) ? undefined : value;
};

// The form kit's base text control. `number` turns it into a numeric input
// owning the string/number conversion; plain text fields store the text itself.
export function TextField({
  label,
  multiline = false,
  number = false,
}: {
  label: string;
  multiline?: boolean;
  number?: boolean;
}) {
  const field = useFieldContext<string | number | null | undefined>();
  const error = field.state.meta.errors[0];
  const errorId = `${field.name}-error`;
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Control
        id={field.name}
        // step="any" allows decimals.
        {...(number ? { type: "number", step: "any" } : {})}
        // A nullish stored value reads as an empty input, so callers never
        // convert. A number feeds React's number-input path unstringified,
        // which keeps intermediate text like "3." while typing.
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(
            number ? toNumber(event.target.value) : event.target.value,
          )
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
