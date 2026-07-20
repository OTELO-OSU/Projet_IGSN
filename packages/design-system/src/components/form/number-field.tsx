import { TextField } from "./text-field.tsx";

// A numeric input: the form store holds `number | undefined`, never NaN.
export function NumberField({
  label,
  requiredToPublish,
  disabled,
}: {
  label: string;
  requiredToPublish?: boolean;
  disabled?: boolean;
}) {
  return (
    <TextField
      number
      label={label}
      requiredToPublish={requiredToPublish}
      disabled={disabled}
    />
  );
}
