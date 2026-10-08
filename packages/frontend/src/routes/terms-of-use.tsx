import { createFileRoute } from "@tanstack/react-router";

import { TermsOfUse } from "#/terms-of-use/terms-of-use.tsx";

export const Route = createFileRoute("/terms-of-use")({
  component: TermsOfUse,
});
