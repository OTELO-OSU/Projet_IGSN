import { createFileRoute } from "@tanstack/react-router";

import { PrivacyPolicy } from "#/legal/privacy-policy.tsx";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
});
