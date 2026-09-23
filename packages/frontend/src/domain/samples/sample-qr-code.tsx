import { sampleLandingPage } from "@projet-igsn/domain/sample/core/sample-landing-page";
import { QRCodeSVG } from "qrcode.react";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";

export function SampleQrCode({ igsn }: { igsn: string }) {
  return (
    <QRCodeSVG
      value={sampleLandingPage(igsn, FRONTEND_URL)}
      size={96}
      role="img"
      aria-label={m.sample_qr_code_label({ igsn })}
      className="size-28 rounded-lg bg-white p-2"
    />
  );
}
