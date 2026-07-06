import { Label } from "../ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

export type SelectFieldItem = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  items: SelectFieldItem[];
  placeholder: string;
};

export function SelectField({ label, items, placeholder }: SelectFieldProps) {
  const field = useFieldContext<string>();
  const error = field.state.meta.errors[0];
  const errorId = `${field.name}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Select
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        <SelectTrigger
          id={field.name}
          onBlur={field.handleBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
