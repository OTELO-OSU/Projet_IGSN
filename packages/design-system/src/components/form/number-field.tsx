import { TextField } from "./text-field.tsx";

// A numeric input owning the string/number conversion: the form store holds
// `number | undefined` (never NaN), blank or partial input reads as undefined.
export function NumberField({ label }: { label: string }) {
  return (
    <TextField<number | undefined>
      number
      label={label}
      parse={(text) => {
        const value = Number(text);
        return text === "" || Number.isNaN(value) ? undefined : value;
      }}
    />
  );
}
