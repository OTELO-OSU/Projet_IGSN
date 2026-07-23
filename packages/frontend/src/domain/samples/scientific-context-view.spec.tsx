import { render } from "vitest-browser-react";

import { ScientificContextView } from "./scientific-context-view.tsx";

describe("ScientificContextView", () => {
  it("should render every part of a recent collection", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "recent_collection",
          funderOrganization: "03fd77x13",
          researchProgramName: "Deep Earth Sampling",
          researchProgramChief: "Marie Curie",
          researchProgramChiefOrcid: "0000-0002-1825-0097",
          researchStructure: ["043htjv09", "00z54nq84"],
          collectorName: "John Field",
          collectorOrcid: "0000-0001-2345-6789",
          researchCampaign: "Atlantic 2025",
          funding: "ANR grant 42",
          researchProgramDescription: "A deep sampling programme.",
          fieldName: "Mid-Atlantic Ridge",
          missionDescription: "Six weeks at sea.",
        }}
      />,
    );

    await expect
      .element(screen.getByText("Provenance status"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Recent collection"))
      .toBeInTheDocument();

    // Organizations resolve their ROR to a name and link to ror.org.
    const funder = screen.getByRole("link", {
      name: /Institut national de physique nucléaire/,
    });
    await expect
      .element(funder)
      .toHaveAttribute("href", "https://ror.org/03fd77x13");
    await expect
      .element(screen.getByRole("link", { name: "CY Cergy Paris Université" }))
      .toHaveAttribute("href", "https://ror.org/043htjv09");
    await expect
      .element(
        screen.getByRole("link", { name: "Institut de Physique (CNRS - INP)" }),
      )
      .toHaveAttribute("href", "https://ror.org/00z54nq84");

    // ORCID iDs link to orcid.org.
    await expect
      .element(screen.getByRole("link", { name: "0000-0002-1825-0097" }))
      .toHaveAttribute("href", "https://orcid.org/0000-0002-1825-0097");

    await expect.element(screen.getByText("John Field")).toBeInTheDocument();
    await expect.element(screen.getByText("Atlantic 2025")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Six weeks at sea."))
      .toBeInTheDocument();
  });

  it("should render every part of a historical specimen", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "historical_specimen",
          collectionCurator: "Alfred Curator",
          collectionOrigin: "scientific_expedition",
          collectorName: "Old Collector",
          collectionContextDescription: "Collected during the 1890 expedition.",
        }}
      />,
    );

    await expect
      .element(screen.getByText("Collection / historical specimen"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Scientific expedition"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Alfred Curator"))
      .toBeInTheDocument();
    // Recent-collection fields never appear on a historical specimen.
    await expect
      .element(screen.getByText("Funder organization"))
      .not.toBeInTheDocument();
  });

  it("should render only the fields that are present", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "recent_collection",
          researchProgramName: "Only the name",
        }}
      />,
    );

    await expect.element(screen.getByText("Only the name")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Funder organization"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Collector name"))
      .not.toBeInTheDocument();
  });
});
