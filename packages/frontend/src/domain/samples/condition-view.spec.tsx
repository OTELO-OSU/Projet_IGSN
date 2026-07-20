import { render } from "vitest-browser-react";

import { ConditionView } from "./condition-view.tsx";

describe("ConditionView", () => {
  it("should render every part of a full condition", async () => {
    const screen = await render(
      <ConditionView
        condition={{
          packaging: "glass_bottle",
          storageConditions: ["temperature_controlled", "light_controlled"],
          temperature: {
            type: "frozen",
            measurement: { value: -18, unit: "celsius" },
          },
          humidity: { type: "controlled", percentage: 40 },
          light: "total_darkness",
          pressure: {
            type: "controlled_gas",
            measurement: { value: 1.2, unit: "bar" },
          },
          specificConditions: "Stored under argon after freeze-drying",
        }}
      />,
    );

    await expect.element(screen.getByText("Packaging")).toBeInTheDocument();
    await expect.element(screen.getByText("Glass bottle")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Storage conditions"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Temperature controlled, Light controlled"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Temperature", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Frozen (-18 °C)"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Relative humidity"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Controlled (e.g. 40% ± 5%) (40%)"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Light", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Total darkness"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Pressure", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(
        screen.getByText("Controlled gas pressure (N2, Ar, CO2...) (1.2 bar)"),
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Specific conditions"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Stored under argon after freeze-drying"))
      .toBeInTheDocument();
  });

  it("should render a category without its numeric reading", async () => {
    const screen = await render(
      <ConditionView
        condition={{
          temperature: { type: "ambient" },
          humidity: { type: "dry" },
          pressure: { type: "vacuum" },
        }}
      />,
    );

    await expect
      .element(screen.getByText("Ambient", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("10-30% (dry)", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Vacuum (partial or total)", { exact: true }))
      .toBeInTheDocument();
  });

  it("should render only the parts that are present", async () => {
    const screen = await render(
      <ConditionView condition={{ packaging: "paper_bag" }} />,
    );

    await expect.element(screen.getByText("Packaging")).toBeInTheDocument();
    await expect.element(screen.getByText("Paper bag")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Storage conditions"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Temperature", { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Relative humidity"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Light", { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Pressure", { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Specific conditions"))
      .not.toBeInTheDocument();
  });

  it("should render the temperature unit through its display label", async () => {
    const screen = await render(
      <ConditionView
        condition={{
          temperature: {
            type: "refrigerated",
            measurement: { value: 277, unit: "kelvin" },
          },
        }}
      />,
    );

    await expect
      .element(screen.getByText("Refrigerated (277 K)"))
      .toBeInTheDocument();
  });
});
