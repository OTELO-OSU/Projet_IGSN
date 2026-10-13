import faviconUrl from "@projet-igsn/design-system/assets/favicon.png";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/manifest.json")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          short_name: "IGSN",
          name: "IGSN Sample Library",
          icons: [{ src: faviconUrl, type: "image/png", sizes: "192x192" }],
          start_url: ".",
          display: "standalone",
          theme_color: "#000000",
          background_color: "#ffffff",
        }),
    },
  },
});
