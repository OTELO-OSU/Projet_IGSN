import type { SynchronizationStatus } from "@projet-igsn/domain/sample/sample";

import { render } from "vitest-browser-react";

import { SynchronizationStatusBadge } from "./synchronization-status-badge.tsx";

describe("SynchronizationStatusBadge", () => {
  it.each<[SynchronizationStatus, string]>([
    ["pending", "Synchronization pending"],
    ["synced", "Synchronized"],
    ["failed", "Synchronization failed"],
  ])(
    "should label a %s synchronization %s",
    async (synchronizationStatus, label) => {
      const screen = await render(
        <SynchronizationStatusBadge
          synchronizationStatus={synchronizationStatus}
        />,
      );

      await expect
        .element(screen.getByText(label, { exact: true }))
        .toBeVisible();
    },
  );

  it("should render nothing for a sample DataCite does not know", async () => {
    const screen = await render(
      <SynchronizationStatusBadge synchronizationStatus={null} />,
    );

    expect(screen.container.textContent).toBe("");
  });
});
