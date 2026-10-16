import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@projet-igsn/design-system/components/ui/radio-group";
import { PrinterIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { frontendSampleUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

const LABEL_SIZES_CM = [1.5, 3, 5, 8] as const;

type LabelSizeCm = (typeof LABEL_SIZES_CM)[number];

const DEFAULT_LABEL_SIZE_CM: LabelSizeCm = 3;

export function PrintSampleLabelDialog({ igsn }: { igsn: string }) {
  const [sizeCm, setSizeCm] = useState<LabelSizeCm>(DEFAULT_LABEL_SIZE_CM);
  const centimeters = new Intl.NumberFormat(getLocale(), {
    style: "unit",
    unit: "centimeter",
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <PrinterIcon aria-hidden />
          {m.sample_print_label_action()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.sample_print_label_title()}</DialogTitle>
          <DialogDescription>
            {m.sample_print_label_description()}
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          aria-label={m.sample_print_label_size()}
          value={String(sizeCm)}
          onValueChange={(value) => setSizeCm(Number(value) as LabelSizeCm)}
          className="flex flex-wrap gap-4"
        >
          {LABEL_SIZES_CM.map((size) => (
            <div key={size} className="flex items-center gap-2">
              <RadioGroupItem value={String(size)} id={`label-size-${size}`} />
              <Label htmlFor={`label-size-${size}`}>
                {centimeters.format(size)}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <SampleLabel igsn={igsn} sizeCm={sizeCm} className="mx-auto flex" />
        {createPortal(
          <SampleLabel
            igsn={igsn}
            sizeCm={sizeCm}
            className="sample-label hidden print:flex"
          />,
          document.body,
        )}
        <DialogFooter>
          <Button type="button" onClick={() => window.print()}>
            {m.sample_print_label_print()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SampleLabel({
  igsn,
  sizeCm,
  className,
}: {
  igsn: string;
  sizeCm: LabelSizeCm;
  className: string;
}) {
  return (
    <div
      className={`flex-col items-center gap-1 ${className}`}
      style={{ width: `${sizeCm}cm` }}
    >
      <QRCodeSVG
        value={frontendSampleUrl(igsn)}
        role="img"
        aria-label={m.sample_print_label_qr_code({ igsn })}
        style={{ width: `${sizeCm}cm`, height: `${sizeCm}cm` }}
      />
      <p
        className="w-full text-center font-mono break-all"
        style={{ fontSize: `${sizeCm / 8}cm` }}
      >
        {igsn}
      </p>
    </div>
  );
}
