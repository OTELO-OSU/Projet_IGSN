import type {
  SampleStatus,
  SynchronizationStatus,
} from "@projet-igsn/domain/sample/sample";

import { render } from "vitest-browser-react";

import { SynchronizationStatusBadge } from "./synchronization-status-badge.tsx";

describe("SynchronizationStatusBadge", () => {
  it.each<[SampleStatus, SynchronizationStatus, string]>([
    ["published", "pending", "Synchronization pending"],
    ["draft", "pending", "Publishing"],
    ["published", "synced", "Synchronized"],
    ["draft", "failed", "Synchronization failed"],
  ])(
    "should label a %s sample with a %s synchronization %s",
    async (status, synchronizationStatus, label) => {
      const screen = await render(
        <SynchronizationStatusBadge
          sample={{ status, synchronizationStatus }}
        />,
      );

      await expect
        .element(screen.getByText(label, { exact: true }))
        .toBeVisible();
    },
  );

  it("should render nothing for a sample DataCite does not know", async () => {
    const screen = await render(
      <SynchronizationStatusBadge
        sample={{ status: "draft", synchronizationStatus: null }}
      />,
    );

    expect(screen.container.textContent).toBe("");
  });
});
