import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

// The form kit's base text control. NumberField reuses it through
// `number`/`parse`, which map the input text to the stored value; plain text
// fields store the text itself.
export function TextField<Value = string>({
  label,
  multiline = false,
  number = false,
  parse = (text) => text as unknown as Value,
}: {
  label: string;
  multiline?: boolean;
  number?: boolean;
  parse?: (text: string) => Value;
}) {
  const field = useFieldContext<Value>();
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
        value={(field.state.value ?? "") as string | number}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(parse(event.target.value))}
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
