import { Checkbox } from "@projet-igsn/design-system/components/ui/checkbox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";

import { m } from "#/paraglide/messages.js";

export function ReserveInternalIdsField({
  isReserving,
  onReservingChange,
  reserveCount,
  onReserveCountChange,
  isCountInvalid,
}: {
  isReserving: boolean;
  onReservingChange: (isReserving: boolean) => void;
  reserveCount: string;
  onReserveCountChange: (reserveCount: string) => void;
  isCountInvalid: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Checkbox
          id="customize-template-reserve"
          checked={isReserving}
          onCheckedChange={(checked) => onReservingChange(checked === true)}
        />
        <Label htmlFor="customize-template-reserve">
          {m.import_template_reserve_label()}
        </Label>
      </div>
      {isReserving ? (
        <div className="grid gap-2">
          <Label htmlFor="customize-template-reserve-count">
            {m.import_template_reserve_count_label()}
          </Label>
          <Input
            id="customize-template-reserve-count"
            type="number"
            min={25}
            max={MAX_IMPORT_ROWS}
            step={25}
            className="sm:max-w-72"
            value={reserveCount}
            onChange={(event) => onReserveCountChange(event.target.value)}
            aria-invalid={isCountInvalid}
            aria-describedby={
              isCountInvalid
                ? "customize-template-reserve-count-hint customize-template-reserve-count-error"
                : "customize-template-reserve-count-hint"
            }
          />
          <p
            id="customize-template-reserve-count-hint"
            className="text-muted-foreground text-sm"
          >
            {m.import_template_reserve_count_hint({ max: MAX_IMPORT_ROWS })}
          </p>
          {isCountInvalid ? (
            <p
              id="customize-template-reserve-count-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {m.import_template_reserve_count_invalid({
                max: MAX_IMPORT_ROWS,
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
