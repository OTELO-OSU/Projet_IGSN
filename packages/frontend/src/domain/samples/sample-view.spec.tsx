import type { Sample } from "@projet-igsn/domain/sample/sample";

import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { SampleView } from "./sample-view.tsx";

const render = (ui: React.ReactNode) => renderWithRouter(ui);

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
  texture: null,
  metamorphicFacies: null,
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
  links: [],
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

  it("should show the Links section when the sample has links", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          links: [
            {
              id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
              url: "https://doi.org/10.1594/IEDA.100252",
              description: null,
            },
          ],
        })}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Links" }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("link", {
          name: "https://doi.org/10.1594/IEDA.100252",
        }),
      )
      .toBeVisible();
  });

  it("should hide the Links section when the sample has none", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Links" }).query(),
    ).toBeNull();
  });

  it("should show the translated nature", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect.element(screen.getByText("Rock powder")).toBeInTheDocument();
  });

  it("should show the type hierarchy as a breadcrumb labelled by its field", async () => {
    const screen = await render(
      <SampleView sample={sample({ type: "core.half_round" })} />,
    );

    const type = screen.getByRole("list", { name: "Type" });
    await expect
      .element(type.getByText("Core", { exact: true }))
      .toBeInTheDocument();
    await expect.element(type.getByText("Core Half round")).toBeInTheDocument();
    await expect
      .element(type.getByRole("img", { name: ">" }))
      .toBeInTheDocument();
  });

  it("should show the material hierarchy as a breadcrumb labelled by its field", async () => {
    const screen = await render(
      <SampleView sample={sample({ material: "rock.igneous" })} />,
    );

    const material = screen.getByRole("list", { name: "Material" });
    await expect
      .element(material.getByText("Rock", { exact: true }))
      .toBeInTheDocument();
    await expect.element(material.getByText("Igneous")).toBeInTheDocument();
    await expect
      .element(material.getByRole("img", { name: ">" }))
      .toBeInTheDocument();
  });

  it("should show the translated texture when set", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          material: "rock.igneous.plutonic.felsic.granite",
          texture: "phaneritic",
        })}
      />,
    );

    await expect.element(screen.getByText("Phaneritic")).toBeInTheDocument();
  });

  it("should show the translated metamorphic facies when set", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          material: "rock.metamorphic.strongly_metamorphosed.gneiss",
          metamorphicFacies: "amphibolite",
        })}
      />,
    );

    await expect
      .element(screen.getByText("Amphibolite facies"))
      .toBeInTheDocument();
  });

  it("should show the specific name", async () => {
    const screen = await render(
      <SampleView sample={sample({ specificName: "BRT-GRN-2025-07" })} />,
    );

    await expect
      .element(screen.getByText("BRT-GRN-2025-07"))
      .toBeInTheDocument();
  });

  it("should show the collection method hierarchy as a breadcrumb labelled by its field", async () => {
    const screen = await render(
      <SampleView
        sample={sample({ collectionMethod: "coring.gravity_corer" })}
      />,
    );

    const collectionMethod = screen.getByRole("list", {
      name: "Collection method",
    });
    await expect
      .element(collectionMethod.getByText("Coring", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(collectionMethod.getByText("GravityCorer"))
      .toBeInTheDocument();
    await expect
      .element(collectionMethod.getByRole("img", { name: ">" }))
      .toBeInTheDocument();
  });

  it("should show the collection method description when set", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          collectionMethod: "coring.gravity_corer",
          collectionMethodDescription: "Cored at low tide from the reef flat",
        })}
      />,
    );

    await expect
      .element(screen.getByText("Collection method details"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Cored at low tide from the reef flat"))
      .toBeInTheDocument();
  });

  it("should show the translated existence and availability statuses and the publication year when set", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          existenceStatus: "lost",
          availabilityStatus: "not_available",
          publicationYear: 2026,
        })}
      />,
    );

    await expect
      .element(screen.getByText("Existence status"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Lost")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Availability status"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Not available")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Publication year"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("2026")).toBeInTheDocument();
  });

  it("should show a single numeric age with its unit", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          age: {
            ...emptyAge,
            numericAgeMin: 120,
            numericAgeMax: 120,
            numericAgeUnit: "ma",
          },
        })}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Age" }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("120 Ma")).toBeInTheDocument();
  });

  it("should show a numeric age range with a shared unit", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          age: {
            ...emptyAge,
            numericAgeMin: 500,
            numericAgeMax: 2000,
            numericAgeUnit: "ka",
          },
        })}
      />,
    );

    await expect.element(screen.getByText("500-2000 ka")).toBeInTheDocument();
  });

  it("should show the translated geological age", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          age: { ...emptyAge, geologicalAgeMin: 8, geologicalAgeMax: 8 },
        })}
      />,
    );

    await expect
      .element(screen.getByText("Cretaceous Upper"))
      .toBeInTheDocument();
  });

  it("should show the free-text geological unit", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          age: { ...emptyAge, geologicalUnit: "Green Sandstone Fm" },
        })}
      />,
    );

    await expect
      .element(screen.getByText("Green Sandstone Fm"))
      .toBeInTheDocument();
  });

  it("should omit the Age section when there is no age", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { name: "Age" }))
      .not.toBeInTheDocument();
  });

  it("should show the economic interest as its own section", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          resourceType: "mineral_and_ore",
          economicDepositName: "Chuquicamata",
        })}
      />,
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Economic interest" }),
      )
      .toBeInTheDocument();
    await expect.element(screen.getByText("Chuquicamata")).toBeInTheDocument();
  });

  it("should show the economic interest section when only a detail field is set", async () => {
    const screen = await render(
      <SampleView sample={sample({ economicDepositName: "Chuquicamata" })} />,
    );

    await expect
      .element(
        screen.getByRole("heading", { level: 2, name: "Economic interest" }),
      )
      .toBeInTheDocument();
  });

  it("should omit the Economic interest section when unanswered", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { name: "Economic interest" }))
      .not.toBeInTheDocument();
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

  it("should omit the Institution section when the sample carries no group", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { name: "Institution" }))
      .not.toBeInTheDocument();
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

  it("should omit the Groups section when the sample belongs to none", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { name: "Groups" }))
      .not.toBeInTheDocument();
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

  it("should omit the Synthetic details section when the sample was not synthesised", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { name: "Synthetic details" }))
      .not.toBeInTheDocument();
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

  it("should omit type, material, and collection method rows when unclassified", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("list", { name: "Type" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("list", { name: "Material" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("list", { name: "Collection method" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Collection method details"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("heading", { name: "Location" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("heading", { name: "Description" }))
      .not.toBeInTheDocument();
  });

  it("should show the description section with its rows when set", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          description: {
            collectionDate: { start: "2024-03-05", end: "2024-03-05" },
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

  it("should omit the Geological context section when both fields are unset", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { name: "Geological context" }))
      .not.toBeInTheDocument();
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
            currentArchiveContact: "archivist@example.org",
            originalArchiveContact: "museum@example.org",
          },
        })}
      />,
    );

    await expect
      .element(screen.getByText("archivist@example.org"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("museum@example.org"))
      .not.toBeInTheDocument();
  });

  it("should omit the Repository section when the sample has no repository", async () => {
    const screen = await render(<SampleView sample={sample()} />);

    await expect
      .element(screen.getByRole("heading", { name: "Repository" }))
      .not.toBeInTheDocument();
  });

  it("should show the locality name and description", async () => {
    const screen = await render(
      <SampleView
        sample={sample({
          location: {
            localityName: "Reef flat",
            localityDescription: "Southern reef flat, Tahiti",
          },
        })}
      />,
    );

    await expect
      .element(screen.getByText("Reef flat", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Southern reef flat, Tahiti"))
      .toBeInTheDocument();
  });
});
