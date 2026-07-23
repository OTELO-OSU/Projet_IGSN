import { render } from "vitest-browser-react";

import { SampleView } from "./sample-view.tsx";

describe("SampleView", () => {
  it("should show the name as the heading and the igsn as subtitle", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type="core.half_round"
        material="rock.igneous"
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod="coring.gravity_corer"
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("0123456789ABCDEFGHJKMNPQRS"))
      .toBeInTheDocument();
  });

  it("should show the Links section when the sample has links", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
        links={[
          {
            id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
            url: "https://doi.org/10.1594/IEDA.100252",
            description: null,
          },
        ]}
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
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Links" }).query(),
    ).toBeNull();
  });

  it("should show the translated nature", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    await expect.element(screen.getByText("Rock powder")).toBeInTheDocument();
  });

  it("should show the type hierarchy as a breadcrumb labelled by its field", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type="core.half_round"
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    const type = screen.getByRole("list", { name: "Type" });
    await expect
      .element(type.getByText("Core", { exact: true }))
      .toBeInTheDocument();
    await expect.element(type.getByText("Core Half round")).toBeInTheDocument();
    // The chevron separator reads as ">" to assistive tech.
    await expect
      .element(type.getByRole("img", { name: ">" }))
      .toBeInTheDocument();
  });

  it("should show the material hierarchy as a breadcrumb labelled by its field", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material="rock.igneous"
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
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
        name="Granite 1"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material="rock.igneous.plutonic.felsic.granite"
        texture="phaneritic"
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    await expect.element(screen.getByText("Phaneritic")).toBeInTheDocument();
  });

  it("should show the translated metamorphic facies when set", async () => {
    const screen = await render(
      <SampleView
        name="Gneiss 1"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material="rock.metamorphic.strongly_metamorphosed.gneiss"
        texture={null}
        metamorphicFacies="amphibolite"
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    await expect
      .element(screen.getByText("Amphibolite facies"))
      .toBeInTheDocument();
  });

  it("should show the specific name", async () => {
    const screen = await render(
      <SampleView
        name="Brittany Granite"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName="BRT-GRN-2025-07"
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    await expect
      .element(screen.getByText("BRT-GRN-2025-07"))
      .toBeInTheDocument();
  });

  it("should show the collection method hierarchy as a breadcrumb labelled by its field", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod="coring.gravity_corer"
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
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
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod="coring.gravity_corer"
        collectionMethodDescription="Cored at low tide from the reef flat"
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        security={null}
        availability={null}
        publicationYear={null}
        age={null}
      />,
    );

    await expect
      .element(screen.getByText("Collection method details"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Cored at low tide from the reef flat"))
      .toBeInTheDocument();
  });

  it("should show the translated availability and the publication year when set", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        security={null}
        availability="no_longer_exists"
        publicationYear={2026}
        age={null}
      />,
    );

    await expect.element(screen.getByText("Availability")).toBeInTheDocument();
    await expect
      .element(screen.getByText("No longer exists"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Publication year"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("2026")).toBeInTheDocument();
  });

  const emptyAge = {
    numericAgeMin: null,
    numericAgeMax: null,
    numericAgeUnit: null,
    numericAgeYearsUnit: null,
    geologicalAgeMin: null,
    geologicalAgeMax: null,
    geologicalUnit: null,
  };

  const baseProps = {
    name: "Basalt 42",
    igsn: "0123456789ABCDEFGHJKMNPQRS",
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
    location: null,
    security: null,
    availability: null,
    publicationYear: null,
    age: null,
  } as const;

  it("should show a single numeric age with its unit", async () => {
    const screen = await render(
      <SampleView
        {...baseProps}
        age={{
          ...emptyAge,
          numericAgeMin: 120,
          numericAgeMax: 120,
          numericAgeUnit: "ma",
        }}
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
        {...baseProps}
        age={{
          ...emptyAge,
          numericAgeMin: 500,
          numericAgeMax: 2000,
          numericAgeUnit: "ka",
        }}
      />,
    );

    await expect.element(screen.getByText("500-2000 ka")).toBeInTheDocument();
  });

  it("should show the translated geological age", async () => {
    const screen = await render(
      <SampleView
        {...baseProps}
        age={{
          ...emptyAge,
          geologicalAgeMin: 8,
          geologicalAgeMax: 8,
        }}
      />,
    );

    await expect
      .element(screen.getByText("Cretaceous Upper"))
      .toBeInTheDocument();
  });

  it("should show the free-text geological unit", async () => {
    const screen = await render(
      <SampleView
        {...baseProps}
        age={{ ...emptyAge, geologicalUnit: "Green Sandstone Fm" }}
      />,
    );

    await expect
      .element(screen.getByText("Green Sandstone Fm"))
      .toBeInTheDocument();
  });

  it("should omit the Age section when there is no age", async () => {
    const screen = await render(<SampleView {...baseProps} age={null} />);

    await expect
      .element(screen.getByRole("heading", { name: "Age" }))
      .not.toBeInTheDocument();
  });

  it("should show the security as its own section with its hazards", async () => {
    const screen = await render(
      <SampleView
        {...baseProps}
        security={{
          radioactivity: true,
          radioactivityExplanation: "3.2 kBq alpha",
        }}
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
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

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
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={{
          collectionDate: { start: "2024-03-05", end: "2024-03-05" },
          mass: { value: 1.4, unit: "kg" },
        }}
        condition={null}
        scientificContext={null}
        location={null}
        age={null}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Description" }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("March 5, 2024")).toBeInTheDocument();
    await expect.element(screen.getByText("1.4 kg")).toBeInTheDocument();
  });

  it("should show the condition as its own section with its rows", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        description={null}
        condition={{
          packaging: "glass_bottle",
          temperature: {
            type: "frozen",
            measurement: { value: -18, unit: "celsius" },
          },
        }}
        scientificContext={null}
        location={null}
        security={null}
        availability={null}
        publicationYear={null}
        age={null}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 2, name: "Condition" }))
      .toBeInTheDocument();
    // A condition alone does not open the description section.
    await expect
      .element(screen.getByRole("heading", { name: "Description" }))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText("Glass bottle")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Frozen (-18 °C)"))
      .toBeInTheDocument();
  });

  it("should show a point location with its coordinates, elevation and navigation type", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={{
          position: {
            type: "point",
            longitude: -149.83,
            latitude: -17.53,
            elevation: { min: -2500, max: -2500, unit: "m", datum: "msl" },
          },
          navigationType: "GPS",
        }}
        age={null}
      />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Location" }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Latitude")).toBeInTheDocument();
    await expect
      .element(screen.getByText("-17.53", { exact: true }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Longitude")).toBeInTheDocument();
    await expect
      .element(screen.getByText("-149.83", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("-2500 m (Mean sea level)"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("GPS", { exact: true }))
      .toBeInTheDocument();
  });

  it("should show an area location with its bounds and elevation range", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={{
          position: {
            type: "area",
            westLongitude: -5.5,
            eastLongitude: 10.25,
            southLatitude: 41.5,
            northLatitude: 51.5,
            elevation: { min: 100, max: 200, unit: "m", datum: "wgs84" },
          },
        }}
        age={null}
      />,
    );

    await expect
      .element(screen.getByText("West longitude"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("-5.5", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("East longitude"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("10.25", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("South latitude"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("41.5", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("North latitude"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("51.5", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("100 - 200 m (WGS84 ellipsoid)"))
      .toBeInTheDocument();
  });

  it("should show the region as a localized country name", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={{ region: { kind: "continent", country: "FR" } }}
        age={null}
      />,
    );

    await expect.element(screen.getByText("Region")).toBeInTheDocument();
    await expect.element(screen.getByText("France")).toBeInTheDocument();
  });

  it("should show the region as an ocean name", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={{ region: { kind: "ocean", oceanSea: "pacific_ocean" } }}
        age={null}
      />,
    );

    await expect.element(screen.getByText("Region")).toBeInTheDocument();
    await expect.element(screen.getByText("Pacific Ocean")).toBeInTheDocument();
  });

  it.each<[string, { kind: "continent" } | { kind: "ocean" }, string]>([
    [
      "a leafless continent region",
      { kind: "continent" },
      "Continent / country",
    ],
    ["a leafless ocean region", { kind: "ocean" }, "Ocean / sea"],
  ])("should show %s as its kind label", async (_label, region, expected) => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={{ region }}
        age={null}
      />,
    );

    await expect.element(screen.getByText("Region")).toBeInTheDocument();
    await expect.element(screen.getByText(expected)).toBeInTheDocument();
  });

  it("should show the locality name and description", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        metamorphicFacies={null}
        specificName={null}
        collectionMethod={null}
        collectionMethodDescription={null}
        security={null}
        availability={null}
        publicationYear={null}
        description={null}
        condition={null}
        scientificContext={null}
        location={{
          localityName: "Reef flat",
          localityDescription: "Southern reef flat, Tahiti",
        }}
        age={null}
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
