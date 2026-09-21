import { createFileRoute } from "@tanstack/react-router";

import { TombstoneNotice } from "#/domain/samples/tombstone-notice.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/tombstone")({
  head: () => ({
    meta: [
      { title: m.sample_tombstone_title() },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TombstoneNotice,
});
