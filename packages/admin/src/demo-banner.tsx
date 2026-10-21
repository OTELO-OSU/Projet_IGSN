import {
  Alert,
  AlertDescription,
} from "@projet-igsn/design-system/components/ui/alert";
import { Ribbon } from "@projet-igsn/design-system/components/ui/ribbon";
import { InfoIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function DemoBanner() {
  if (import.meta.env.VITE_DEMO_BANNER !== "true") return null;
  return (
    <Alert
      variant="info"
      role="status"
      className="rounded-none border-x-0 border-t-0"
    >
      <InfoIcon />
      <AlertDescription>{m.demo_banner()}</AlertDescription>
    </Alert>
  );
}

export function DemoRibbon() {
  if (import.meta.env.VITE_DEMO_BANNER !== "true") return null;
  return <Ribbon text={m.demo_ribbon()} />;
}
