import { render } from "vitest-browser-react";

import { EconomicInterestView } from "./economic-interest-view.tsx";

describe("EconomicInterestView", () => {
  it("should render the resource type path as a breadcrumb labelled by its field", async () => {
    const screen = await render(
      <EconomicInterestView
        resourceType="mineral_and_ore.porphyry"
        economicInterestElements={[]}
        economicResourceTypePrecision={null}
        economicDepositName={null}
        economicDepositDescription={null}
      />,
    );

    const path = screen.getByRole("list", { name: "Resource type" });
    await expect
      .element(path.getByText("Mineral and Ore Resources"))
      .toBeInTheDocument();
    await expect
      .element(path.getByText("Porphyry ore deposits"))
      .toBeInTheDocument();
    await expect
      .element(path.getByRole("img", { name: ">" }).first())
      .toBeInTheDocument();
  });

  it("should render the elements and the free-text details", async () => {
    const screen = await render(
      <EconomicInterestView
        resourceType="mineral_and_ore"
        economicInterestElements={["cu", "au"]}
        economicResourceTypePrecision="copper-gold"
        economicDepositName="Chuquicamata"
        economicDepositDescription="Open-pit porphyry copper mine."
      />,
    );

    await expect
      .element(screen.getByText("Chemical elements of interest"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Copper, Gold")).toBeInTheDocument();
    await expect.element(screen.getByText("copper-gold")).toBeInTheDocument();
    await expect.element(screen.getByText("Chuquicamata")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Open-pit porphyry copper mine."))
      .toBeInTheDocument();
  });

  it("should omit the rows the sample has no value for", async () => {
    const screen = await render(
      <EconomicInterestView
        resourceType={null}
        economicInterestElements={[]}
        economicResourceTypePrecision="copper-gold"
        economicDepositName={null}
        economicDepositDescription={null}
      />,
    );

    await expect.element(screen.getByText("copper-gold")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Resource type", { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Deposit name"))
      .not.toBeInTheDocument();
  });
});
