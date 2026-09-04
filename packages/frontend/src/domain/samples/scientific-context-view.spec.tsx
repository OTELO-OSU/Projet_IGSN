import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { render } from "vitest-browser-react";

import { ScientificContextView } from "./scientific-context-view.tsx";

describe("ScientificContextView", () => {
  it("should render every part of a field sample", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "field_sample",
          funderOrganizations: ["03fd77x13", "02cte4b68"],
          researchProgramName: "Deep Earth Sampling",
          chiefScientist: "Marie Curie",
          chiefScientistOrcid: "0000-0002-1825-0097",
          hostInstitution: ["043htjv09", "00z54nq84"],
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
    await expect.element(screen.getByText("Field sample")).toBeInTheDocument();

    for (const ror of ["03fd77x13", "02cte4b68", "043htjv09", "00z54nq84"]) {
      await expect
        .element(screen.getByRole("link", { name: organizationLabel(ror) }))
        .toHaveAttribute("href", `https://ror.org/${ror}`);
    }

    await expect
      .element(screen.getByRole("link", { name: "0000-0002-1825-0097" }))
      .toHaveAttribute("href", "https://orcid.org/0000-0002-1825-0097");

    await expect.element(screen.getByText("John Field")).toBeInTheDocument();
    await expect.element(screen.getByText("Atlantic 2025")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Six weeks at sea."))
      .toBeInTheDocument();
  });

  it("should render every part of a collection specimen", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "collection_specimen",
          collectionCurator: "Alfred Curator",
          collectionOrigin: "scientific_expedition",
          collectorName: "Old Collector",
          collectionContextDescription: "Collected during the 1890 expedition.",
        }}
      />,
    );

    await expect
      .element(screen.getByText("Collection specimen"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Scientific expedition"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Alfred Curator"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Funder organizations"))
      .not.toBeInTheDocument();
  });

  it("should render only the fields that are present", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "field_sample",
          researchProgramName: "Only the name",
        }}
      />,
    );

    await expect.element(screen.getByText("Only the name")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Funder organizations"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Collector name"))
      .not.toBeInTheDocument();
  });
});
