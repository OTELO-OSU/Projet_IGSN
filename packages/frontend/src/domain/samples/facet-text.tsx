import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";

export function TextFacet({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <SearchField
        label={label}
        placeholder={label}
        defaultValue={value ?? ""}
        onSearch={(next) => onChange(next.trim() || undefined)}
      />
    </div>
  );
}
