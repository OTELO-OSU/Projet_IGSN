import { Input } from "@projet-igsn/design-system/components/ui/input";
import { SearchIcon } from "lucide-react";

export function SearchTextInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <div className="relative">
        <Input
          type="search"
          value={value}
          placeholder={placeholder}
          // Legible on the colored hero; the native clear button is ugly.
          className="bg-background ps-9 [&::-webkit-search-cancel-button]:appearance-none"
          onChange={(event) => onChange(event.target.value)}
        />
        <SearchIcon
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
        />
      </div>
    </label>
  );
}
