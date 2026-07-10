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
        collectionMethod="coring.gravity_corer"
      />,
    );

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Basalt 42" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("0123456789ABCDEFGHJKMNPQRS"))
      .toBeInTheDocument();
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
        collectionMethod={null}
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
        collectionMethod={null}
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
        collectionMethod={null}
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
        collectionMethod={null}
      />,
    );

    await expect.element(screen.getByText("Phaneritic")).toBeInTheDocument();
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
        collectionMethod="coring.gravity_corer"
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

  it("should omit type, material, and collection method rows when unclassified", async () => {
    const screen = await render(
      <SampleView
        name="Basalt 42"
        igsn="0123456789ABCDEFGHJKMNPQRS"
        nature="rock_powder"
        type={null}
        material={null}
        texture={null}
        collectionMethod={null}
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
  });
});
