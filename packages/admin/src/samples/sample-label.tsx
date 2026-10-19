import { QRCodeSVG } from "qrcode.react";

import { frontendSampleUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";

export const LABEL_SIZES_CM = [1.5, 3, 5, 8] as const;

export type LabelSizeCm = (typeof LABEL_SIZES_CM)[number];

export function SampleLabel({
  igsn,
  name,
  sizeCm,
  className,
}: {
  igsn: string;
  name: string;
  sizeCm: LabelSizeCm;
  className: string;
}) {
  const fontSize = `${sizeCm / 8}cm`;
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
        style={{ fontSize }}
      >
        {igsn}
      </p>
      <p className="line-clamp-2 w-full text-center" style={{ fontSize }}>
        {name}
      </p>
    </div>
  );
}
