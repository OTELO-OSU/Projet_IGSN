import { Label } from "../ui/label.tsx";
import { FieldRow } from "./field-row.tsx";

export function SuggestionRow({
  label,
  format,
}: {
  label: string;
  format?: (value: unknown) => string;
}) {
  return (
    <FieldRow format={format}>
      <Label asChild>
        <span>{label}</span>
      </Label>
    </FieldRow>
  );
}
