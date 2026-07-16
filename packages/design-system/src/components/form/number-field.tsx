import { TextField } from "./text-field.tsx";

// A numeric input: the form store holds `number | undefined`, never NaN.
export function NumberField({ label }: { label: string }) {
  return <TextField number label={label} />;
}
