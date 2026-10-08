import { createFileRoute } from "@tanstack/react-router";

import { Partners } from "#/partners/partners.tsx";

export const Route = createFileRoute("/partners")({
  component: Partners,
});
