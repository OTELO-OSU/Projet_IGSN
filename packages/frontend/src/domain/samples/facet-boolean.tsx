import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { useId } from "react";

export function BooleanFacet({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
