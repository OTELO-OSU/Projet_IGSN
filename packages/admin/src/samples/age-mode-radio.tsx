import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@projet-igsn/design-system/components/ui/radio-group";

import { m } from "#/paraglide/messages.js";

export type AgeMode = "fixed" | "range";

export function AgeModeRadio({
  mode,
  onChange,
  idPrefix,
  label,
  disabled,
}: {
  mode: AgeMode;
  onChange: (mode: AgeMode) => void;
  idPrefix: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={mode}
      disabled={disabled}
      onValueChange={(value) => onChange(value as AgeMode)}
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value="fixed" id={`${idPrefix}-fixed`} />
        <Label htmlFor={`${idPrefix}-fixed`}>{m.age_mode_fixed()}</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="range" id={`${idPrefix}-range`} />
        <Label htmlFor={`${idPrefix}-range`}>{m.age_mode_range()}</Label>
      </div>
    </RadioGroup>
  );
}
