import { createFileRoute } from "@tanstack/react-router";

import { LegalNotice } from "#/legal/legal-notice.tsx";

export const Route = createFileRoute("/legal-notice")({
  component: LegalNotice,
});
