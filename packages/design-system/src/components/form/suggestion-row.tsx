import { Label } from "../ui/label.tsx";
import { FieldRow } from "./field-row.tsx";
import { useFieldSuggestions } from "./field-suggestion-context.tsx";

export function SuggestionRow({
  label,
  format,
}: {
  label: string;
  format?: (value: unknown) => string;
}) {
  const { suggestions } = useFieldSuggestions();
  if (!suggestions.some(({ value }) => value !== undefined)) return null;
  return (
    <FieldRow format={format}>
      <Label asChild>
        <span>{label}</span>
      </Label>
    </FieldRow>
  );
}
