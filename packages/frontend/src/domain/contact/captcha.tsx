import type { AltchaWidgetElement } from "altcha";
import type {} from "altcha/types/react";
import type { Ref } from "react";

import { useEffect } from "react";

import { baseBrowserApiUrl } from "#/api.ts";

const challengeUrl = new URL("captcha/challenge", baseBrowserApiUrl).href;

export function Captcha({ ref }: { ref: Ref<AltchaWidgetElement> }) {
  useEffect(() => {
    void import("altcha");
  }, []);

  return <altcha-widget ref={ref} challenge={challengeUrl} />;
}
