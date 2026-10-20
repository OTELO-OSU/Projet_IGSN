import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { PrinterIcon } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";

import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";
import { LabelSheet, type LabelledSample } from "#/samples/label-sheet.tsx";
import { LABEL_SIZES_CM, type LabelSizeCm } from "#/samples/sample-label.tsx";

export function PrintLabelsMenu({ samples }: { samples: LabelledSample[] }) {
  const [sizeCm, setSizeCm] = useState<LabelSizeCm | null>(null);
  const centimeters = new Intl.NumberFormat(getLocale(), {
    style: "unit",
    unit: "centimeter",
  });

  const print = (nextSizeCm: LabelSizeCm) => {
    flushSync(() => setSizeCm(nextSizeCm));
    window.addEventListener("afterprint", () => setSizeCm(null), {
      once: true,
    });
    window.print();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost">
            <PrinterIcon aria-hidden />
            {m.action_print_labels()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {LABEL_SIZES_CM.map((cm) => (
            <DropdownMenuItem key={cm} onSelect={() => print(cm)}>
              {centimeters.format(cm)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {sizeCm === null ? null : (
        <LabelSheet samples={samples} sizeCm={sizeCm} />
      )}
    </>
  );
}
