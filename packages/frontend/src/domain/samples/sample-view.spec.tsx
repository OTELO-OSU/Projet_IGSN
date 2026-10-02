import type { SampleLineage } from "@projet-igsn/domain/sample/lineage/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { sampleLandingPage } from "@projet-igsn/domain/sample/core/sample-landing-page";

import { FRONTEND_URL } from "#/frontend-url.ts";

import type { PublishedSample } from "./sample-sections.tsx";

import {
  emptyAge,
  publishedSample as sample,
} from "../../../test/published-sample.ts";
import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";
import { SampleView } from "./sample-view.tsx";

const render = (ui: React.ReactNode, stubPaths?: string[]) =>
  renderWithRouter(stubAuth(ui), stubPaths);

type Screen = Awaited<ReturnType<typeof render>>;

const region = (screen: Screen, name: string) =>
  screen.getByRole("region", { name, exact: true });

const headingTexts = (screen: Screen, level: number) =>
  screen
    .getByRole("heading", { level })
    .elements()
    .map((heading) => heading.textContent);

const RUBRICS = [
  "Identity",
  "Lineage",
  "Sample classification",
  "Location",
  "Age",
  "Physical description",
  "Scientific context",
  "Conservation and security",
  "Curation and repository",
  "Related resources",
];

const day = (date: string) => ({
  precision: "day" as const,
  start: date,
  end: date,
});

const subSampleParents: PublishedSample["parents"] = [
  {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
    igsn: "0123456789ABCDEFGHJKMNPQRT",
    name: "Basalt 41",
    material: null,
  },
];

const relation: PublishedSample["relations"][number] = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  relationType: "is_cited_by",
  identifierType: "doi",
  identifier: "https://doi.org/10.1594/IEDA.100252",
  targetTitle: "IEDA companion dataset",
  targetResourceType: null,
  relatedMetadataScheme: null,
  schemeURI: null,
  schemeType: null,
  description: null,
};

const parentLineage: SampleLineage = {
  nodes: [
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3304",
      igsn: "0123456789ABCDEFGHJKMNPQRT",
      name: "Basalt 41",
      generation: -1,
      tombstone: false,
    },
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3300",
      igsn: "0123456789ABCDEFGHJKMNPQRS",
      name: "Basalt 42",
      generation: 0,
      tombstone: false,
    },
  ],
  edges: [
    {
      parentId: "3f2504e0-4f89-41d3-9a0c-0305e82c3304",
      childId: "3f2504e0-4f89-41d3-9a0c-0305e82c3300",
    },
  ],
};

const fullSample = () =>
  sample({
    localId: "FTB-42",
    type: "core.half_round",
    collectionMethod: "coring.gravity_corer",
    publicationYear: 2026,
    processSteps: [{ kind: "subsampling", description: "Split with a saw" }],
    manualGroups: [
      { id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302", name: "Volcano" },
    ],
    institutionalOrganization: "04vfs2w97",
    material: "rock_and_sediment.mineral",
    mineralClassifications: [{ strunzId: "9.E", mindatId: 2815 }],
    economicDepositName: "Chuquicamata",
    syntheticDetails: { equipmentUsed: "Piston cylinder press" },
    location: {
      position: { type: "point", longitude: 2.96, latitude: 45.77 },
      localityName: "Reef flat",
    },
    geologicalContextDescription: "Sampled in a peat bog margin",
    age: { ...emptyAge, geologicalUnit: "Green Sandstone Fm" },
    description: {
      collectionDate: day("2024-03-05"),
      mass: { value: 1.4, unit: "kg" },
    },
    scientificContext: {
      provenanceStatus: "field_sample",
      funding: "ANR grant 42",
      additionalRoles: [],
    },
    condition: { packaging: "glass_bottle" },
    security: { radioactivity: true },
    existenceStatus: "lost",
    availabilityStatus: "not_available",
    repository: { currentArchiveOsu: "OMP", rightsHolder: [] },
    relations: [relation],
  });

describe("SampleView", () => {
  it("should show the name as the heading and the igsn as subtitle", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("0123456789ABCDEFGHJKMNPQRS"))
      .toBeInTheDocument();
  });

  it("should show the internal id beside the igsn in the hero", async () => {
    const screen = await render(
      <SampleView sample={sample({ internalNumber: 42 })} />,
    );

    await expect.element(screen.getByText("sample-42")).toBeInTheDocument();
  });

  it("should show a QR code labelled for the sample igsn in the hero", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("img", { name: /QR code/ }))
      .toBeInTheDocument();
  });

  it("should encode the canonical landing page of the sample", () => {
    expect(sampleLandingPage("0123456789ABCDEFGHJKMNPQRS", FRONTEND_URL)).toBe(
      "http://localhost:3000/samples/0123456789ABCDEFGHJKMNPQRS",
    );
  });

  it("should mark only the section being read as the current nav link", async () => {
    const screen = await render(
      <SampleView
        sample={sample({ description: { mass: { value: 1.4, unit: "kg" } } })}
      />,
    );

    await expect
      .element(screen.getByRole("link", { name: "Identity" }))
      .toHaveAttribute("aria-current", "location");
    await expect
      .element(screen.getByRole("link", { name: "Physical description" }))
      .not.toHaveAttribute("aria-current");
  });

  it("should show the related resources section when the sample has relations", async () => {
    const screen = await render(
      <SampleView sample={sample({ relations: [relation] })} />,
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Related resources" }),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "IEDA companion dataset" }))
      .toBeVisible();
  });

  it("should show only the Identity rubric, with no sub-group nor optional row, on a bare sample", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeVisible();
    expect(headingTexts(screen, 2)).toEqual(["Identity"]);
    expect(headingTexts(screen, 3)).toEqual([]);
    const shown = [
      ...["Type", "Material", "Collection method"].map(
        (name) => [name, screen.getByRole("list", { name })] as const,
      ),
      [
        "Collection method details",
        screen.getByText("Collection method details"),
      ] as const,
    ]
      .filter(([, locator]) => locator.query() !== null)
      .map(([name]) => name);
    expect(shown).toEqual([]);
  });

  it("should list the ten rubrics in admin order as h2 headings and nav links on a fully filled sample", async () => {
    const screen = await render(
      <SampleView sample={fullSample()} lineage={parentLineage} />,
      ["/samples/$igsn"],
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Identity" }))
      .toBeVisible();
    expect(headingTexts(screen, 2)).toEqual(RUBRICS);
    expect(
      screen
        .getByRole("navigation", { name: "Sample" })
        .getByRole("link")
        .elements()
        .map((link) => link.textContent),
    ).toEqual(RUBRICS);
  });

  it.each<[string, string, Partial<PublishedSample>]>([
    [
      "Conservation and security",
      "a condition alone",
      { condition: { packaging: "glass_bottle" } },
    ],
    [
      "Conservation and security",
      "a hazard alone",
      { security: { radioactivity: true } },
    ],
    [
      "Curation and repository",
      "an existence status alone",
      { existenceStatus: "lost" },
    ],
    [
      "Curation and repository",
      "a repository alone",
      { repository: { currentArchiveOsu: "OMP", rightsHolder: [] } },
    ],
  ])("should show the %s rubric for %s", async (rubric, _case, overrides) => {
    const screen = await render(<SampleView sample={sample(overrides)} />);

    await expect
      .element(screen.getByRole("heading", { level: 2, name: rubric }))
      .toBeVisible();
  });

  it.each<[string, string]>([
    ["Identity", "Process steps"],
    ["Identity", "Groups"],
    ["Identity", "Institution"],
    ["Sample classification", "Strunz-Mindat (2026) Classifications"],
    ["Sample classification", "Economic interest"],
    ["Sample classification", "Synthetic details"],
    ["Location", "Geological context"],
    ["Conservation and security", "Condition"],
    ["Conservation and security", "Security"],
    ["Curation and repository", "Repository"],
  ])(
    "should nest the %s > %s sub-group as an h3 region",
    async (rubric, subGroup) => {
      const screen = await render(<SampleView sample={fullSample()} />);

      await expect
        .element(
          region(screen, rubric)
            .getByRole("region", { name: subGroup, exact: true })
            .getByRole("heading", { level: 3, name: subGroup, exact: true }),
        )
        .toBeInTheDocument();
    },
  );

  it("should place the collection date, provenance status, institution and publication year in Identity, and the statuses in Curation", async () => {
    const screen = await render(<SampleView sample={fullSample()} />);

    const identity = region(screen, "Identity");
    for (const text of [
      "Collection date",
      "2024-03-05",
      "Provenance status",
      "Field sample",
      "Université de Lorraine",
      "Publication year",
      "2026",
    ]) {
      await expect
        .element(identity.getByText(text, { exact: true }))
        .toBeInTheDocument();
    }
    const curation = region(screen, "Curation and repository");
    for (const text of [
      "Existence status",
      "Lost",
      "Availability status",
      "Not available",
    ]) {
      await expect
        .element(curation.getByText(text, { exact: true }))
        .toBeInTheDocument();
    }
    await expect
      .element(identity.getByText("Existence status"))
      .not.toBeInTheDocument();
    await expect
      .element(
        region(screen, "Physical description").getByText("Collection date"),
      )
      .not.toBeInTheDocument();
    await expect
      .element(
        region(screen, "Scientific context").getByText("Provenance status"),
      )
      .not.toBeInTheDocument();
  });

  it.each<[string, Partial<PublishedSample>, string, string[]]>([
    [
      "Identity",
      {
        localId: "FTB-2026-042",
        localIdDescription: "Catalogue number",
        type: "core.half_round",
        collectionMethod: "coring.gravity_corer",
        collectionMethodDescription: "Cored at low tide",
        scientificContext: { provenanceStatus: "collection_specimen" },
        description: { collectionDate: day("2024-03-05") },
        publicationYear: 2026,
      },
      "Identity",
      [
        "Local ID",
        "Local ID description",
        "Type",
        "Nature",
        "Collection method",
        "Collection method details",
        "Provenance status",
        "Collection date",
        "Publication year",
      ],
    ],
    [
      "Location of a point",
      {
        location: {
          position: {
            type: "point",
            longitude: -149.83,
            latitude: -17.53,
            vertical: {
              position: 2500,
              reference: "bathymetry",
              system: "msl",
            },
          },
          navigationType: "GPS",
          region: { kind: "country", country: "FR" },
          localityName: "Reef flat",
          localityDescription: "Southern reef flat",
        },
      },
      "Location",
      [
        "Longitude",
        "Latitude",
        "Vertical position",
        "Vertical reference",
        "Vertical reference system",
        "Navigation type",
        "Region",
        "Locality name",
        "Locality description",
      ],
    ],
    [
      "Location of a line",
      {
        location: {
          position: {
            type: "line",
            startLongitude: 2.35,
            startLatitude: 48.85,
            endLongitude: 4.83,
            endLatitude: 45.76,
          },
        },
      },
      "Location",
      ["Start longitude", "End longitude", "Start latitude", "End latitude"],
    ],
    [
      "Geological context",
      {
        geologicalContextDescription: "Sampled in a peat bog margin",
        physiographicEnvironment: "wetland.peat_bog",
      },
      "Geological context",
      ["Physiographic environment", "Description"],
    ],
    [
      "Physical description",
      {
        description: {
          openDescription: "Dark basalt",
          length: { value: 12, unit: "cm" },
          mass: { value: 1.4, unit: "kg" },
          oriented: true,
          orientationExplanation: "Arrow on the top face",
        },
      },
      "Physical description",
      [
        "General description",
        "Length",
        "Mass",
        "Oriented",
        "Orientation details",
      ],
    ],
    [
      "Repository",
      {
        repository: {
          currentArchiveOsu: "OMP",
          currentArchiveLaboratory: "EA4038",
          collectionName: "Historic basalts",
          rightsHolder: ["03fd77x13"],
        },
      },
      "Repository",
      [
        "Current archive OSU",
        "Current archive laboratory",
        "Rights holder",
        "Collection name",
      ],
    ],
  ])(
    "should order the %s rows like the admin form",
    async (_case, overrides, name, labels) => {
      const screen = await render(<SampleView sample={sample(overrides)} />);

      const rows = region(screen, name);
      await expect.element(rows).toBeInTheDocument();
      expect(
        rows
          .getByRole("term")
          .elements()
          .map((term) => term.textContent),
      ).toEqual(labels);
    },
  );

  it.each([
    {
      collectionDate: {
        precision: "day",
        start: "2024-03-05",
        end: "2024-04-01",
      },
      expected: "2024-03-05 - 2024-04-01",
    },
    {
      collectionDate: {
        precision: "hour",
        start: "2024-03-05T14:30",
        end: "2024-03-05T14:30",
        timeZone: "Europe/Paris",
      },
      expected: "2024-03-05 14:30 (Europe/Paris)",
    },
    {
      collectionDate: {
        precision: "hour",
        start: "2024-03-05T14:30",
        end: "2024-03-06T09:05",
        timeZone: "Pacific/Auckland",
      },
      expected: "2024-03-05 14:30 - 2024-03-06 09:05 (Pacific/Auckland)",
    },
  ] as const)(
    "should show the collection date in Identity as $expected",
    async ({ collectionDate, expected }) => {
      const screen = await render(
        <SampleView sample={sample({ description: { collectionDate } })} />,
      );

      await expect
        .element(region(screen, "Identity").getByText(expected))
        .toBeInTheDocument();
    },
  );

  it.each<[string, Partial<PublishedSample>, string, string]>([
    ["Type", { type: "core.half_round" }, "Core", "Core Half round"],
    [
      "Material",
      { material: "rock_and_sediment.rock.igneous" },
      "Rock",
      "Igneous",
    ],
    [
      "Collection method",
      { collectionMethod: "coring.gravity_corer" },
      "Coring",
      "GravityCorer",
    ],
  ])(
    "should show the %s hierarchy as a breadcrumb labelled by its field",
    async (name, overrides, parent, child) => {
      const screen = await render(<SampleView sample={sample(overrides)} />);

      const list = screen.getByRole("list", { name });
      await expect
        .element(list.getByText(parent, { exact: true }))
        .toBeInTheDocument();
      await expect.element(list.getByText(child)).toBeInTheDocument();
      await expect
        .element(list.getByRole("img", { name: ">" }).first())
        .toBeInTheDocument();
    },
  );

  it.each<[string, Partial<PublishedSample>, (string | RegExp)[]]>([
    ["the translated nature", {}, ["Powder"]],
    [
      "the translated texture",
      {
        material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
        texture: "phaneritic",
      },
      ["Phaneritic"],
    ],
    [
      "the translated metamorphic facies and fabric",
      {
        material:
          "rock_and_sediment.rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "amphibolite",
        metamorphicFabric: "schistose",
      },
      ["Amphibolite facies", "Schistose"],
    ],
    [
      "the specific name",
      { specificName: "BRT-GRN-2025-07" },
      ["BRT-GRN-2025-07"],
    ],
    [
      "the local id and its description",
      {
        localId: "FTB-2026-042",
        localIdDescription: "Number in the laboratory collection catalogue",
      },
      ["FTB-2026-042", "Number in the laboratory collection catalogue"],
    ],
    [
      "the collection method description",
      {
        collectionMethod: "coring.gravity_corer",
        collectionMethodDescription: "Cored at low tide from the reef flat",
      },
      ["Collection method details", "Cored at low tide from the reef flat"],
    ],
    [
      "the translated statuses and the publication year",
      {
        existenceStatus: "lost",
        availabilityStatus: "not_available",
        publicationYear: 2026,
      },
      [
        "Existence status",
        "Lost",
        "Availability status",
        "Not available",
        "Publication year",
        "2026",
      ],
    ],
    [
      "a single numeric age with its unit",
      {
        age: {
          ...emptyAge,
          numericAgeMin: 120,
          numericAgeMax: 120,
          numericAgeUnit: "ma",
        },
      },
      ["120 Ma"],
    ],
    [
      "a numeric age range with a shared unit",
      {
        age: {
          ...emptyAge,
          numericAgeMin: 500,
          numericAgeMax: 2000,
          numericAgeUnit: "ka",
        },
      },
      ["500-2000 Ka"],
    ],
    [
      "a numeric age with its short years reference",
      {
        age: {
          ...emptyAge,
          numericAgeMin: 1200,
          numericAgeMax: 1200,
          numericAgeUnit: "a",
          numericAgeYearsUnit: "ce",
        },
      },
      [/^1200 Year CE$/],
    ],
    [
      "the translated geological age",
      { age: { ...emptyAge, geologicalAgeMin: 8, geologicalAgeMax: 8 } },
      ["Cretaceous Upper"],
    ],
    [
      "the free-text geological unit",
      { age: { ...emptyAge, geologicalUnit: "Green Sandstone Fm" } },
      ["Green Sandstone Fm"],
    ],
    [
      "the locality name and description",
      {
        location: {
          localityName: "Reef flat",
          localityDescription: "Southern reef flat, Tahiti",
        },
      },
      [/^Reef flat$/, "Southern reef flat, Tahiti"],
    ],
  ])("should show %s", async (_label, overrides, texts) => {
    const screen = await render(<SampleView sample={sample(overrides)} />);

    for (const text of texts) {
      await expect.element(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("should show the economic interest in Sample classification when only a detail field is set", async () => {
    const screen = await render(
      <SampleView sample={sample({ economicDepositName: "Chuquicamata" })} />,
    );

    await expect
      .element(
        region(screen, "Sample classification")
          .getByRole("region", { name: "Economic interest" })
          .getByText("Chuquicamata"),
      )
      .toBeInTheDocument();
  });

  it("should list the manual groups the sample belongs to in the Groups sub-group", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          manualGroups: [
            { id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302", name: "Volcano" },
            { id: "3f2504e0-4f89-41d3-9a0c-0305e82c3303", name: "Deep sea" },
          ],
        })}
      />,
    );

    const groups = region(screen, "Groups");
    await expect.element(groups.getByText("Volcano")).toBeInTheDocument();
    await expect.element(groups.getByText("Deep sea")).toBeInTheDocument();
  });

  it("should omit the lineage section when the lineage holds the sample alone", async () => {
    const screen = await render(
      <SampleView
        sample={sample()}
        lineage={{ nodes: [parentLineage.nodes[1]!], edges: [] }}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Lineage" }))
      .not.toBeInTheDocument();
  });

  it("should show the lineage as its own section, in the nav, listing the related samples", async () => {
    const screen = await render(
      <SampleView sample={sample()} lineage={parentLineage} />,
      ["/samples/$igsn"],
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Lineage" }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("navigation").getByRole("link", { name: "Lineage" }),
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "Basalt 41 Parent sample" }))
      .toHaveAttribute("href", "/samples/0123456789ABCDEFGHJKMNPQRT");
  });

  it("should show no Security sub-group in Conservation when no hazard is declared", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          condition: { packaging: "glass_bottle" },
          security: { radioactivity: false, asbestosRich: false },
        })}
      />,
    );

    const conservation = region(screen, "Conservation and security");
    await expect.element(conservation).toBeInTheDocument();
    await expect
      .element(conservation.getByRole("region", { name: "Security" }))
      .not.toBeInTheDocument();
  });

  it("should show no collection date in the Identity of a sub-sample, which inherits its parent's", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          parents: subSampleParents,
          description: {
            collectionDate: day("2024-03-05"),
            mass: { value: 1.4, unit: "kg" },
          },
        })}
      />,
    );

    await expect
      .element(region(screen, "Physical description").getByText("1.4 kg"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Collection date"))
      .not.toBeInTheDocument();
  });

  it.each<[string, Partial<PublishedSample>]>([
    ["a sample", {}],
    ["a sub-sample", { parents: subSampleParents }],
  ])(
    "should hide Physical description for %s whose collection date is its only value",
    async (_case, overrides) => {
      const screen = await render(
        <SampleView
          sample={sample({
            ...overrides,
            description: { collectionDate: day("2024-03-05") },
          })}
        />,
      );

      await expect.element(region(screen, "Identity")).toBeInTheDocument();
      await expect
        .element(
          screen.getByRole("heading", {
            level: 2,
            name: "Physical description",
          }),
        )
        .not.toBeInTheDocument();
    },
  );

  it.each<[string, NonNullable<PublishedSample["scientificContext"]>]>([
    [
      "a field sample",
      { provenanceStatus: "field_sample", additionalRoles: [] },
    ],
    ["a collection specimen", { provenanceStatus: "collection_specimen" }],
  ])(
    "should hide Scientific context for %s holding only its provenance status",
    async (_case, scientificContext) => {
      const screen = await render(
        <SampleView sample={sample({ scientificContext })} />,
      );

      await expect
        .element(region(screen, "Identity").getByText("Provenance status"))
        .toBeInTheDocument();
      await expect
        .element(
          screen.getByRole("heading", { level: 2, name: "Scientific context" }),
        )
        .not.toBeInTheDocument();
    },
  );

  it.each<[string, NonNullable<Sample["location"]>, string[]]>([
    [
      "point",
      {
        position: {
          type: "point",
          longitude: -149.83,
          latitude: -17.53,
          vertical: { position: 2500, reference: "bathymetry", system: "msl" },
        },
        navigationType: "GPS",
      },
      [
        "Latitude",
        "-17.53",
        "Longitude",
        "-149.83",
        "2500 m",
        "Bathymetry",
        "MSL height (EPSG:5714) - Mean sea level",
        "GPS",
      ],
    ],
    [
      "area",
      {
        position: {
          type: "area",
          westLongitude: -5.5,
          eastLongitude: 10.25,
          southLatitude: 41.5,
          northLatitude: 51.5,
          vertical: {
            min: 100,
            max: 200,
            reference: "elevation",
            system: "ngf_ign69",
          },
        },
      },
      [
        "West longitude",
        "-5.5",
        "East longitude",
        "10.25",
        "South latitude",
        "41.5",
        "North latitude",
        "51.5",
        "100 - 200 m",
        "Elevation",
        "NGF-IGN69 height (EPSG:5720) - Metropolitan France",
      ],
    ],
    [
      "line",
      {
        position: {
          type: "line",
          startLongitude: 2.35,
          startLatitude: 48.85,
          endLongitude: 4.83,
          endLatitude: 45.76,
          vertical: {
            start: 10,
            end: 40,
            reference: "core_depth",
            system: "local",
          },
        },
      },
      [
        "Start longitude",
        "2.35",
        "Start latitude",
        "48.85",
        "End longitude",
        "4.83",
        "End latitude",
        "45.76",
        "10 -> 40 m",
        "Core depth",
        "Local or user-defined vertical datum",
      ],
    ],
  ])(
    "should show a %s location with its coordinates and vertical position",
    async (_type, location, texts) => {
      const screen = await render(<SampleView sample={sample({ location })} />);

      const rows = region(screen, "Location");
      for (const text of texts) {
        await expect
          .element(rows.getByText(text, { exact: true }))
          .toBeInTheDocument();
      }
    },
  );

  it("should show the filled endpoint alone when a line carries a single vertical value", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          location: {
            position: {
              type: "line",
              startLongitude: 2.35,
              startLatitude: 48.85,
              endLongitude: 4.83,
              endLatitude: 45.76,
              vertical: { start: null, end: 40 },
            },
          },
        })}
      />,
    );

    await expect.element(screen.getByText("40 m")).toBeInTheDocument();
  });

  it("should show no vertical row when the location carries no vertical data", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          location: {
            position: { type: "point", longitude: -149.83, latitude: -17.53 },
          },
        })}
      />,
    );

    await expect
      .element(screen.getByText("Vertical position"))
      .not.toBeInTheDocument();
  });

  it.each<[string, NonNullable<Sample["location"]>["region"], string]>([
    ["a country region", { kind: "country", country: "FR" }, "France"],
    [
      "an ocean region",
      { kind: "ocean", oceanSea: "pacific_ocean" },
      "Pacific Ocean",
    ],
    ["a leafless country region", { kind: "country" }, "Country"],
    ["a leafless ocean region", { kind: "ocean" }, "Ocean / sea"],
  ])("should show %s as its label", async (_label, region, expected) => {
    const screen = await render(
      <SampleView sample={sample({ location: { region } })} />,
    );

    await expect.element(screen.getByText("Region")).toBeInTheDocument();
    await expect.element(screen.getByText(expected)).toBeInTheDocument();
  });

  it("should show the location map in the Identity rubric when a position is set", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          location: {
            position: { type: "point", longitude: 2.96, latitude: 45.77 },
          },
        })}
      />,
    );

    await expect
      .element(
        region(screen, "Identity").getByRole("group", {
          name: "Sample location map",
        }),
      )
      .toBeInTheDocument();
  });

  it("should show no location map for a region-only location", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          location: { region: { kind: "country", country: "FR" } },
        })}
      />,
    );

    await expect.element(screen.getByText("France")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Sample location map" }).query(),
    ).toBeNull();
  });

  it("should show who declared the sample and when, next to a button opening the contact form", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          owner: { firstname: "Ada", name: "Lovelace" },
          publicationYear: 2026,
        })}
      />,
    );

    await expect
      .element(screen.getByText("Declared in 2026 by Ada Lovelace"))
      .toBeInTheDocument();
    await screen
      .getByRole("button", { name: "Contact the record owner" })
      .click();
    await expect
      .element(screen.getByRole("dialog", { name: "Contact the record owner" }))
      .toBeInTheDocument();
  });

  it("should keep the contact button but omit the declaration line when the owner is unknown", async () => {
    const screen = await render(
      <SampleView sample={sample({ owner: null, publicationYear: 2026 })} />,
    );

    await expect
      .element(screen.getByText(/^Declared in/))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Contact the record owner" }))
      .toBeInTheDocument();
  });

  it("should show the physiographic environment breadcrumb in the Geological context", async () => {
    const screen = await render(
      <SampleView
        sample={sample({ physiographicEnvironment: "wetland.peat_bog" })}
      />,
    );

    const environment = region(screen, "Geological context").getByRole("list", {
      name: "Physiographic environment",
    });
    await expect
      .element(environment.getByText("Wetland", { exact: true }))
      .toBeInTheDocument();
    await expect.element(environment.getByText("Peat bog")).toBeInTheDocument();
  });

  it("should show the osu, the umr, the collection and the rights holders in the Repository", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          repository: {
            currentArchiveOsu: "OMP",
            currentArchiveLaboratory: "EA4038",
            collectionName: "Historic basalts",
            rightsHolder: ["03fd77x13", "02cte4b68"],
          },
        })}
      />,
    );

    const repository = region(screen, "Repository");
    await expect
      .element(repository.getByText(osuLabel("OMP")))
      .toBeInTheDocument();
    await expect
      .element(repository.getByText(laboratoryLabel("EA4038")))
      .toBeInTheDocument();
    await expect
      .element(repository.getByText("Historic basalts"))
      .toBeInTheDocument();
    for (const ror of ["03fd77x13", "02cte4b68"]) {
      await expect
        .element(repository.getByRole("link", { name: organizationLabel(ror) }))
        .toHaveAttribute("href", `https://ror.org/${ror}`);
    }
  });

  it("should never show the archive contacts, which stay private to the admin", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          repository: {
            currentArchiveOsu: "OMP",
            currentArchiveContactFirstname: "Archibald",
            currentArchiveContactLastname: "Archivist",
            rightsHolder: [],
          },
        })}
      />,
    );

    for (const value of ["Archibald", "Archivist"]) {
      await expect.element(screen.getByText(value)).not.toBeInTheDocument();
    }
  });
});
