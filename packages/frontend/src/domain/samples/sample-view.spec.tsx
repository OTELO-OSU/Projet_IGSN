import type { Sample } from "@projet-igsn/domain/sample/sample";

import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";
import { SampleView } from "./sample-view.tsx";

const render = (ui: React.ReactNode, stubPaths?: string[]) =>
  renderWithRouter(stubAuth(ui), stubPaths);

const emptyAge = {
  numericAgeMin: null,
  numericAgeMax: null,
  numericAgeUnit: null,
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
};

const sample = (overrides: Partial<Sample> = {}): Sample => ({
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3300",
  name: "Basalt 42",
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
  nature: "rock_powder",
  type: null,
  material: null,
  materialOtherName: null,
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  specificName: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  description: null,
  condition: null,
  scientificContext: null,
  repository: null,
  geologicalContextDescription: null,
  geomorphologicalEnvironment: null,
  syntheticDetails: null,
  location: null,
  age: null,
  relations: [],
  attachments: [],
  security: null,
  existenceStatus: null,
  availabilityStatus: null,
  publicationYear: null,
  resourceType: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  manualGroups: [],
  parents: [],
  owner: null,
  status: "published",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
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

  it("should mark only the section being read as the current nav link", async () => {
    const screen = await render(
      <SampleView
        sample={sample({ description: { mass: { value: 1.4, unit: "kg" } } })}
      />,
    );

    await expect
      .element(screen.getByRole("link", { name: "Sample" }))
      .toHaveAttribute("aria-current", "location");
    await expect
      .element(screen.getByRole("link", { name: "Description" }))
      .not.toHaveAttribute("aria-current");
  });

  it("should show the related resources section when the sample has relations", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          relations: [
            {
              id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
              relationType: "is_cited_by",
              identifierType: "doi",
              identifier: "https://doi.org/10.1594/IEDA.100252",
              targetTitle: "IEDA companion dataset",
              targetResourceType: null,
              relationTypeInformation: null,
              relatedMetadataScheme: null,
              schemeURI: null,
              schemeType: null,
              description: null,
            },
          ],
        })}
      />,
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

  it("should omit every optional section and row on a bare sample", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeVisible();
    const headings = [
      "Description",
      "Location",
      "Geological context",
      "Condition",
      "Scientific context",
      "Repository",
      "Synthetic details",
      "Institution",
      "Groups",
      "Parent samples",
      "Age",
      "Security",
      "Economic interest",
      "Related resources",
    ].map((name) => [name, screen.getByRole("heading", { name })] as const);
    const lists = ["Type", "Material", "Collection method"].map(
      (name) => [name, screen.getByRole("list", { name })] as const,
    );
    const shown = [
      ...headings,
      ...lists,
      [
        "Collection method details",
        screen.getByText("Collection method details"),
      ] as const,
    ]
      .filter(([, locator]) => locator.query() !== null)
      .map(([name]) => name);
    expect(shown).toEqual([]);
  });

  it.each<[string, Partial<Sample>, string, string]>([
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

  it.each<[string, Partial<Sample>, string[]]>([
    [
      "the other material free text as the last material step",
      {
        material: "rock_and_sediment.rock.other",
        materialOtherName: "Fossilized wood",
      },
      ["Rock and sediment", "Rock", "Other", "Fossilized wood"],
    ],
    [
      "no extra step when the sample has no free text",
      { material: "rock_and_sediment.rock.igneous" },
      ["Rock and sediment", "Rock", "Igneous"],
    ],
  ])("should show %s", async (_case, overrides, steps) => {
    const screen = await render(<SampleView sample={sample(overrides)} />);

    const items = screen
      .getByRole("list", { name: "Material" })
      .getByRole("listitem")
      .elements();
    expect(items.map((item) => item.textContent)).toEqual(steps);
  });

  it.each<[string, Partial<Sample>, (string | RegExp)[]]>([
    ["the translated nature", {}, ["Rock powder"]],
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
      ["500-2000 ka"],
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

  it("should show the economic interest as its own section when only a detail field is set", async () => {
    const screen = await render(
      <SampleView sample={sample({ economicDepositName: "Chuquicamata" })} />,
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Economic interest" }),
      )
      .toBeInTheDocument();
    await expect.element(screen.getByText("Chuquicamata")).toBeInTheDocument();
  });

  it("should show the declarer's institution as its own section", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          institutionalOrganization: "04vfs2w97",
          institutionalOsu: "OTELo",
          institutionalLaboratory: "UMR7358",
        })}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Institution" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Université de Lorraine"))
      .toBeInTheDocument();
  });

  it("should show the manual groups the sample belongs to as their own section", async () => {
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

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Groups" }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Volcano")).toBeInTheDocument();
    await expect.element(screen.getByText("Deep sea")).toBeInTheDocument();
  });

  it("should show the parents as their own section, in the nav, each linking to its sample page", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          parents: [
            {
              id: "3f2504e0-4f89-41d3-9a0c-0305e82c3304",
              igsn: "0123456789ABCDEFGHJKMNPQRT",
              name: "Basalt 41",
              material: null,
            },
          ],
        })}
      />,
      ["/samples/$igsn"],
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Parent samples" }),
      )
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("navigation")
          .getByRole("link", { name: "Parent samples" }),
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "Basalt 41" }))
      .toHaveAttribute("href", "/samples/0123456789ABCDEFGHJKMNPQRT");
  });

  it("should show the synthetic details as their own section", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          syntheticDetails: {
            experimentType: "fusion",
            equipmentUsed: "Piston cylinder press",
          },
        })}
      />,
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Synthetic details" }),
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Piston cylinder press"))
      .toBeInTheDocument();
  });

  it("should show the security as its own section with its hazards", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          security: {
            radioactivity: true,
            radioactivityExplanation: "3.2 kBq alpha",
          },
        })}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Security" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Radioactivity", { exact: true }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("3.2 kBq alpha")).toBeInTheDocument();
  });

  it("should show the description section with its rows when set", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          description: {
            collectionDate: {
              precision: "day",
              start: "2024-03-05",
              end: "2024-03-05",
            },
            mass: { value: 1.4, unit: "kg" },
          },
        })}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Description" }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("2024-03-05")).toBeInTheDocument();
    await expect.element(screen.getByText("1.4 kg")).toBeInTheDocument();
  });

  it("should show the condition as its own section with its rows", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          condition: {
            packaging: "glass_bottle",
            storageConditions: ["temperature_controlled"],
            temperature: {
              type: "frozen",
              measurement: { value: -18, unit: "celsius" },
            },
          },
        })}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Condition" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("heading", { name: "Description" }))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText("Glass bottle")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Frozen (-18 °C)"))
      .toBeInTheDocument();
  });

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

      await expect
        .element(screen.getByRole("heading", { name: "Location" }))
        .toBeInTheDocument();
      for (const text of texts) {
        await expect
          .element(screen.getByText(text, { exact: true }))
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
    ["a country region", { kind: "continent", country: "FR" }, "France"],
    [
      "an ocean region",
      { kind: "ocean", oceanSea: "pacific_ocean" },
      "Pacific Ocean",
    ],
    [
      "a leafless continent region",
      { kind: "continent" },
      "Continent / country",
    ],
    ["a leafless ocean region", { kind: "ocean" }, "Ocean / sea"],
  ])("should show %s as its label", async (_label, region, expected) => {
    const screen = await render(
      <SampleView sample={sample({ location: { region } })} />,
    );

    await expect.element(screen.getByText("Region")).toBeInTheDocument();
    await expect.element(screen.getByText(expected)).toBeInTheDocument();
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

  it("should show the geological context as its own section with the environment breadcrumb", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          geologicalContextDescription: "Sampled in a peat bog margin",
          geomorphologicalEnvironment: "wetland.peat_bog",
        })}
      />,
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Geological context" }),
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Sampled in a peat bog margin"))
      .toBeInTheDocument();
    const environment = screen.getByRole("list", { name: "Environment" });
    await expect
      .element(environment.getByText("Wetland", { exact: true }))
      .toBeInTheDocument();
    await expect.element(environment.getByText("Peat-bog")).toBeInTheDocument();
  });

  it("should show the repository as its own section with the current archive linked to ror.org", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          repository: {
            currentArchive: "03fd77x13",
            collectionName: "Historic basalts",
            originalArchive: "Museum of Nancy",
          },
        })}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Repository" }))
      .toBeInTheDocument();
    await expect
      .element(
        screen.getByRole("link", { name: organizationLabel("03fd77x13") }),
      )
      .toHaveAttribute("href", "https://ror.org/03fd77x13");
    await expect
      .element(screen.getByText("Historic basalts"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Museum of Nancy"))
      .toBeInTheDocument();
  });

  it("should never show the archive contacts, which stay private to the admin", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          repository: {
            currentArchive: "03fd77x13",
            currentArchiveContactFirstname: "Archibald",
            currentArchiveContactLastname: "Archivist",
            originalArchiveContactFirstname: "Museo",
            originalArchiveContactLastname: "Nancy",
          },
        })}
      />,
    );

    for (const value of ["Archibald", "Archivist", "Museo", "Nancy"]) {
      await expect.element(screen.getByText(value)).not.toBeInTheDocument();
    }
  });
});
