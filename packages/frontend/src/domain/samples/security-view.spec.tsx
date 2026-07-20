import { render } from "vitest-browser-react";

import { SecurityView } from "./security-view.tsx";

describe("SecurityView", () => {
  it("should render each declared hazard with its explanation", async () => {
    const screen = await render(
      <SecurityView
        security={{
          radioactivity: true,
          radioactivityExplanation: "3.2 kBq alpha",
          asbestosRich: false,
          chemicalRisk: true,
          chemicalRiskExplanation: "toxic metals",
        }}
      />,
    );

    await expect
      .element(screen.getByText("Radioactivity", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Radioactivity explanation"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("3.2 kBq alpha")).toBeInTheDocument();
    await expect.element(screen.getByText("Asbestos-rich")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Chemical risk", { exact: true }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("toxic metals")).toBeInTheDocument();
  });

  it("should omit a hazard's explanation when it has none", async () => {
    const screen = await render(
      <SecurityView security={{ radioactivity: false }} />,
    );

    await expect
      .element(screen.getByText("Radioactivity", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("No", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Radioactivity explanation"))
      .not.toBeInTheDocument();
    // A hazard never answered is dropped entirely.
    await expect
      .element(screen.getByText("Chemical risk", { exact: true }))
      .not.toBeInTheDocument();
  });
});
