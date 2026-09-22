import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

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
          chiefScientistFirstname: "Marie",
          chiefScientistLastname: "Curie",
          chiefScientistOrcid: "0000-0002-1825-0097",
          hostInstitution: ["043htjv09", "00z54nq84"],
          collectorFirstname: "John",
          collectorLastname: "Field",
          collectorOrcid: "0000-0001-2345-6789",
          researchCampaign: "Atlantic 2025",
          funding: "ANR grant 42",
          researchProgramDescription: "A deep sampling programme.",
          fieldName: "Mid-Atlantic Ridge",
          missionDescription: "Six weeks at sea.",
          additionalRoles: [],
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

    await expect.element(screen.getByText("Marie Curie")).toBeInTheDocument();
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
          collectionCuratorFirstname: "Alfred",
          collectionCuratorLastname: "Curator",
          collectionOrigin: "scientific_expedition",
          collectorFirstname: "Old",
          collectorLastname: "Collector",
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
    await expect.element(screen.getByText("Old Collector")).toBeInTheDocument();
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
          additionalRoles: [],
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

  it.each<[string, ScientificContext, string]>([
    [
      "chief scientist",
      {
        provenanceStatus: "field_sample",
        chiefScientistLastname: "Curie",
        additionalRoles: [],
      },
      "Curie",
    ],
    [
      "collector of a field sample",
      {
        provenanceStatus: "field_sample",
        collectorLastname: "Field",
        additionalRoles: [],
      },
      "Field",
    ],
    [
      "collector of a collection specimen",
      {
        provenanceStatus: "collection_specimen",
        collectorLastname: "Collector",
      },
      "Collector",
    ],
    [
      "collection curator",
      {
        provenanceStatus: "collection_specimen",
        collectionCuratorLastname: "Curator",
      },
      "Curator",
    ],
  ])(
    "should render a %s without a firstname as the lastname alone",
    async (_case, scientificContext, expected) => {
      const screen = await render(
        <ScientificContextView scientificContext={scientificContext} />,
      );

      await expect
        .element(screen.getByText(expected, { exact: true }))
        .toBeInTheDocument();
    },
  );

  it("should group every person of one role under a single row", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "field_sample",
          additionalRoles: [
            {
              role: "project_member",
              personFirstname: "Ada",
              personLastname: "Lovelace",
            },
            {
              role: "project_member",
              personFirstname: "Grace",
              personLastname: "Hopper",
            },
          ],
        }}
      />,
    );

    await expect
      .element(screen.getByText("Project member"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    await expect.element(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("should link the ORCID of a person holding a role", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "field_sample",
          additionalRoles: [
            {
              role: "researcher",
              personFirstname: "Marie",
              personLastname: "Curie",
              personOrcid: "0000-0002-1825-0097",
            },
          ],
        }}
      />,
    );

    await expect.element(screen.getByText("Researcher")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "0000-0002-1825-0097" }))
      .toHaveAttribute("href", "https://orcid.org/0000-0002-1825-0097");
  });

  it.each<[string, ScientificContext]>([
    [
      "a field sample with no additional role",
      { provenanceStatus: "field_sample", additionalRoles: [] },
    ],
    ["a collection specimen", { provenanceStatus: "collection_specimen" }],
  ])("should render no additional-role row for %s", async (_case, context) => {
    const screen = await render(
      <ScientificContextView scientificContext={context} />,
    );

    for (const label of [
      "Researcher",
      "Project manager",
      "Project member",
      "Data manager",
    ]) {
      await expect.element(screen.getByText(label)).not.toBeInTheDocument();
    }
  });
});
