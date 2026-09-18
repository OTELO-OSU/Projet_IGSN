import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { render } from "vitest-browser-react";

import { SyntheticDetailsView } from "./synthetic-details-view.tsx";

describe("SyntheticDetailsView", () => {
  it("should render every part of a synthesis", async () => {
    const screen = await render(
      <SyntheticDetailsView
        syntheticDetails={{
          startingMaterial: "synthetic",
          startingMaterialNature: "powder",
          startingMaterialComposition: "SiO2 + Al2O3",
          finalProduct: "glass",
          experimentType: "fusion",
          experimentDuration: { value: 30, unit: "minute" },
          synthesisDate: {
            precision: "day",
            start: "2020-01-01",
            end: "2020-01-05",
          },
          operatorFirstname: "Marie",
          operatorLastname: "Curie",
          operatorOrcid: "0000-0002-1825-0097",
          researchStructure: ["043htjv09", "00z54nq84"],
          temperature: { value: -20, unit: "celsius" },
          pressure: { value: 2, unit: "gpa" },
          experimentalProtocol: "Piston cylinder run",
          experimentPurpose: "Phase relations",
          equipmentUsed: "Piston cylinder press",
        }}
      />,
    );

    await expect.element(screen.getByText("Synthetic")).toBeInTheDocument();
    await expect.element(screen.getByText("Powder")).toBeInTheDocument();
    await expect.element(screen.getByText("SiO2 + Al2O3")).toBeInTheDocument();
    await expect.element(screen.getByText("Glass")).toBeInTheDocument();
    await expect.element(screen.getByText("Fusion")).toBeInTheDocument();
    await expect.element(screen.getByText("30 min")).toBeInTheDocument();
    await expect
      .element(screen.getByText("2020-01-01 - 2020-01-05"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Marie Curie")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "0000-0002-1825-0097" }))
      .toHaveAttribute("href", "https://orcid.org/0000-0002-1825-0097");
    for (const ror of ["043htjv09", "00z54nq84"]) {
      await expect
        .element(screen.getByRole("link", { name: organizationLabel(ror) }))
        .toHaveAttribute("href", `https://ror.org/${ror}`);
    }
    await expect.element(screen.getByText("-20 °C")).toBeInTheDocument();
    await expect.element(screen.getByText("2 GPa")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Piston cylinder run"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Phase relations"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Piston cylinder press"))
      .toBeInTheDocument();
  });

  it("should render a synthesis that started and ended the same day as a single date", async () => {
    const screen = await render(
      <SyntheticDetailsView
        syntheticDetails={{
          synthesisDate: {
            precision: "day",
            start: "2020-01-01",
            end: "2020-01-01",
          },
        }}
      />,
    );

    await expect
      .element(screen.getByText("2020-01-01", { exact: true }))
      .toBeInTheDocument();
  });

  it("should render the synthesis date time and time zone at hour precision", async () => {
    const screen = await render(
      <SyntheticDetailsView
        syntheticDetails={{
          synthesisDate: {
            precision: "hour",
            start: "2024-03-05T14:30",
            end: "2024-03-06T09:05",
            timeZone: "Europe/Paris",
          },
        }}
      />,
    );

    await expect
      .element(
        screen.getByText("2024-03-05 14:30 - 2024-03-06 09:05 (Europe/Paris)"),
      )
      .toBeInTheDocument();
  });

  it("should render an operator without a firstname as the lastname alone", async () => {
    const screen = await render(
      <SyntheticDetailsView syntheticDetails={{ operatorLastname: "Curie" }} />,
    );

    await expect
      .element(screen.getByText("Curie", { exact: true }))
      .toBeInTheDocument();
  });
});
