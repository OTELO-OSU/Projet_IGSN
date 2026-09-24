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
          funding: "ANR grant 42",
          researchProgramDescription: "A deep sampling programme.",
          platformType: "ship",
          launchPlatformName: "RV Marion Dufresne",
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

    for (const orcid of ["0000-0002-1825-0097", "0000-0001-2345-6789"]) {
      await expect
        .element(screen.getByRole("link", { name: orcid }))
        .toHaveAttribute("href", `https://orcid.org/${orcid}`);
    }

    await expect.element(screen.getByText("Marie Curie")).toBeInTheDocument();
    await expect.element(screen.getByText("John Field")).toBeInTheDocument();
    await expect.element(screen.getByText("Ship")).toBeInTheDocument();
    await expect
      .element(screen.getByText("RV Marion Dufresne"))
      .toBeInTheDocument();
  });

  it("should render every part of a collection specimen", async () => {
    const screen = await render(
      <ScientificContextView
        scientificContext={{
          provenanceStatus: "collection_specimen",
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
    await expect.element(screen.getByText("Old Collector")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Funder organizations"))
      .not.toBeInTheDocument();
  });

  it.each<[string, ScientificContext, string[]]>([
    [
      "field sample",
      {
        provenanceStatus: "field_sample",
        funderOrganizations: ["03fd77x13"],
        researchProgramName: "Deep Earth Sampling",
        chiefScientistLastname: "Curie",
        chiefScientistOrcid: "0000-0002-1825-0097",
        hostInstitution: ["043htjv09"],
        collectorLastname: "Field",
        collectorOrcid: "0000-0001-2345-6789",
        funding: "ANR grant 42",
        researchProgramDescription: "A deep sampling programme.",
        platformType: "ship",
        launchPlatformName: "RV Marion Dufresne",
        additionalRoles: [{ role: "researcher", personLastname: "Lovelace" }],
      },
      [
        "Provenance status",
        "Collector name",
        "Collector ORCID",
        "Chief scientist / Project leader",
        "Chief scientist ORCID",
        "Host institution (project leader)",
        "Researcher",
        "Funder organizations",
        "Funding",
        "Name of the Research Programm/Campaign/Mission/Field/Cruise",
        "Open description Research Programm/Campaign/Mission/Field/Cruise",
        "Platform type",
        "Launch platform name",
      ],
    ],
    [
      "collection specimen",
      {
        provenanceStatus: "collection_specimen",
        collectionOrigin: "scientific_expedition",
        collectorLastname: "Collector",
        collectionContextDescription: "Collected during the 1890 expedition.",
      },
      [
        "Provenance status",
        "Collection origin",
        "Collector name",
        "Open description of the collection context",
      ],
    ],
  ])(
    "should order the rows of a %s",
    async (_case, scientificContext, labels) => {
      const screen = await render(
        <ScientificContextView scientificContext={scientificContext} />,
      );

      expect(
        screen
          .getByRole("term")
          .elements()
          .map((term) => term.textContent),
      ).toEqual(labels);
    },
  );

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
