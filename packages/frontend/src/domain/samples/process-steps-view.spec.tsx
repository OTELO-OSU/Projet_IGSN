import { render } from "vitest-browser-react";

import { ProcessStepsView } from "./process-steps-view.tsx";

describe("ProcessStepsView", () => {
  it("should render every part of a step", async () => {
    const screen = await render(
      <ProcessStepsView
        processSteps={[
          {
            kind: "subsampling",
            date: {
              precision: "day",
              start: "2020-01-01",
              end: "2020-01-05",
            },
            description: "Split with a rock saw",
          },
        ]}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Sub-sampling" }))
      .toBeVisible();
    await expect
      .element(screen.getByText("2020-01-01 - 2020-01-05"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Split with a rock saw"))
      .toBeVisible();
  });
});
