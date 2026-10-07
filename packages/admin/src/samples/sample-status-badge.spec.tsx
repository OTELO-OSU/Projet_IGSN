import type { SampleStatus } from "@projet-igsn/domain/sample/sample";

import { render } from "vitest-browser-react";

import { SampleStatusBadge } from "./sample-status-badge.tsx";

describe("SampleStatusBadge", () => {
  it.each<[SampleStatus, string]>([
    ["publishing", "Publishing"],
    ["publish_failed", "Publish failed"],
    ["embargo", "Under embargo"],
  ])("should label a %s sample %s", async (status, label) => {
    const screen = await render(<SampleStatusBadge status={status} />);

    await expect.element(screen.getByText(label)).toBeVisible();
  });
});
