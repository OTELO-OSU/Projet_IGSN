import { createFileRoute } from "@tanstack/react-router";

import { AuthCallback } from "#/auth/auth-callback.tsx";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AuthCallback,
});
