import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@projet-igsn/design-system/components/ui/select";

const ANY_VALUE = "all";

export function SelectFilter({
  id,
  label,
  anyLabel,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  items: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <>
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? ANY_VALUE}
        onValueChange={(next) =>
          onChange(next === ANY_VALUE ? undefined : next)
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_VALUE}>{anyLabel}</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
