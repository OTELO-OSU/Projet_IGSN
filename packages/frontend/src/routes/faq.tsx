import { createFileRoute } from "@tanstack/react-router";

import { Faq } from "#/faq/faq.tsx";

export const Route = createFileRoute("/faq")({
  component: Faq,
});
