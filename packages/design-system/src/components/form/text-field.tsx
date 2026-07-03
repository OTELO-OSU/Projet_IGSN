import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

export function TextField({ label }: { label: string }) {
  const field = useFieldContext<string>();
  const error = field.state.meta.errors[0];
  const errorId = `${field.name}-error`;
  return (
    <div>
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
