import { render } from "vitest-browser-react";

import { DescriptionView } from "./description-view.tsx";

describe("DescriptionView", () => {
  it("should render every part of a full description", async () => {
    const screen = await render(
      <DescriptionView
        description={{
          collectionDate: { start: "2024-03-05", end: "2024-03-05" },
          oriented: true,
          orientationExplanation: "Arrow drawn on the top face",
          openDescription: "Dark fine-grained basalt with olivine phenocrysts",
          length: { value: 12, unit: "cm" },
          width: { value: 8, unit: "cm" },
          thickness: { value: 15, unit: "mm" },
          mass: { value: 1.4, unit: "kg" },
          volume: { value: 350, unit: "ml" },
        }}
      />,
    );

    await expect
      .element(screen.getByText("Collection date"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("March 5, 2024")).toBeInTheDocument();
    await expect.element(screen.getByText("Oriented")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Yes", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Orientation details"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Arrow drawn on the top face"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("General description"))
      .toBeInTheDocument();
    await expect
      .element(
        screen.getByText("Dark fine-grained basalt with olivine phenocrysts"),
      )
      .toBeInTheDocument();
    await expect.element(screen.getByText("Length")).toBeInTheDocument();
    await expect.element(screen.getByText("12 cm")).toBeInTheDocument();
    await expect.element(screen.getByText("Width")).toBeInTheDocument();
    await expect.element(screen.getByText("8 cm")).toBeInTheDocument();
    await expect.element(screen.getByText("Thickness")).toBeInTheDocument();
    await expect.element(screen.getByText("15 mm")).toBeInTheDocument();
    await expect.element(screen.getByText("Mass")).toBeInTheDocument();
    await expect.element(screen.getByText("1.4 kg")).toBeInTheDocument();
    await expect.element(screen.getByText("Volume")).toBeInTheDocument();
    await expect.element(screen.getByText("350 mL")).toBeInTheDocument();
  });

  it("should show a collection period as a date range", async () => {
    const screen = await render(
      <DescriptionView
        description={{
          collectionDate: { start: "2024-03-05", end: "2024-04-01" },
        }}
      />,
    );

    await expect
      .element(screen.getByText("March 5, 2024 – April 1, 2024"))
      .toBeInTheDocument();
  });

  it("should show a translated No for a non-oriented sample", async () => {
    const screen = await render(
      <DescriptionView description={{ oriented: false }} />,
    );

    await expect.element(screen.getByText("Oriented")).toBeInTheDocument();
    await expect
      .element(screen.getByText("No", { exact: true }))
      .toBeInTheDocument();
  });

  it("should render only the parts that are present", async () => {
    const screen = await render(
      <DescriptionView description={{ mass: { value: 2, unit: "g" } }} />,
    );

    await expect.element(screen.getByText("Mass")).toBeInTheDocument();
    await expect.element(screen.getByText("2 g")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Collection date"))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText("Oriented")).not.toBeInTheDocument();
    await expect
      .element(screen.getByText("General description"))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText("Length")).not.toBeInTheDocument();
    await expect.element(screen.getByText("Volume")).not.toBeInTheDocument();
  });

  it("should render the volume unit through its display label", async () => {
    const screen = await render(
      <DescriptionView description={{ volume: { value: 27, unit: "cm3" } }} />,
    );

    await expect.element(screen.getByText("27 cm³")).toBeInTheDocument();
  });
});
