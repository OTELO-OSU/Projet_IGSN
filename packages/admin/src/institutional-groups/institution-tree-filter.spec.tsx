import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { InstitutionTreeFilter } from "./institution-tree-filter.tsx";

const LORRAINE = "Université de Lorraine";
const AMU = "Aix-Marseille Université (AMU)";
const PYTHEAS = "Institut PYTHEAS (PYTHEAS)";
const MIO = "Institut Méditerranéen d'Océanographie (MIO)";
const OTELO = "Observatoire Terre et Environnement de Lorraine (OTELo)";
const GEORESSOURCES = "GéoRessources (GEORESSOURCES)";
const CRPG = "Centre de recherches pétrographiques et géochimiques (CRPG)";
const LA_ROCHELLE = "La Rochelle Université";
const CHIZE = "Centre d'études biologiques de Chizé (CEBC)";
const STANDALONE = "Standalone Research Units";
const SEARCH_LABEL = "Search institutions";

async function openFilter() {
  const onChange = vi.fn();
  const screen = await render(
    <InstitutionTreeFilter value={undefined} onChange={onChange} />,
  );
  await screen.getByRole("combobox").click();
  return { screen, onChange };
}

describe("InstitutionTreeFilter", () => {
  it("should reveal the OSUs then the laboratories of an expanded organization", async () => {
    const { screen } = await openFilter();

    await screen.getByRole("button", { name: `Show ${AMU}` }).click();

    await expect
      .element(screen.getByRole("button", { name: PYTHEAS, exact: true }))
      .toBeVisible();

    await screen.getByRole("button", { name: `Show ${PYTHEAS}` }).click();

    await expect
      .element(screen.getByRole("button", { name: MIO, exact: true }))
      .toBeVisible();
  });

  it("should keep a matching laboratory with its OSU and organization, and drop the rest", async () => {
    const { screen } = await openFilter();

    await screen.getByLabelText(SEARCH_LABEL).fill("GéoRessources");

    await expect
      .element(screen.getByRole("button", { name: LORRAINE, exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: OTELO, exact: true }).first())
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("button", { name: GEORESSOURCES, exact: true })
          .first(),
      )
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: CRPG, exact: true }).elements(),
    ).toHaveLength(0);
  });

  it("should keep the whole subtree of a matching OSU", async () => {
    const { screen } = await openFilter();

    await screen.getByLabelText(SEARCH_LABEL).fill("OTELo");

    await expect
      .element(screen.getByRole("button", { name: CRPG, exact: true }).first())
      .toBeVisible();
  });

  it("should list a laboratory with no OSU under a collapsible non-selectable standalone heading", async () => {
    const { screen } = await openFilter();

    await screen.getByRole("button", { name: `Show ${LA_ROCHELLE}` }).click();

    await expect.element(screen.getByText(STANDALONE)).toBeVisible();
    await screen.getByRole("button", { name: `Show ${STANDALONE}` }).click();
    await expect
      .element(screen.getByRole("button", { name: CHIZE, exact: true }).first())
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: STANDALONE, exact: true }).elements(),
    ).toHaveLength(0);
  });

  it("should emit the same laboratory value whichever parent it is picked under", async () => {
    const { screen, onChange } = await openFilter();

    await screen.getByLabelText(SEARCH_LABEL).fill("GéoRessources");
    const laboratory = screen.getByRole("button", {
      name: GEORESSOURCES,
      exact: true,
    });
    expect(laboratory.elements().length).toBeGreaterThan(1);

    await laboratory.first().click();

    await screen.getByRole("combobox").click();
    await laboratory.last().click();

    expect(onChange.mock.calls).toEqual([
      ["laboratory:UMR7359"],
      ["laboratory:UMR7359"],
    ]);
  });

  it("should scope an OSU value to the organization it was picked under", async () => {
    const { screen, onChange } = await openFilter();

    await screen.getByRole("button", { name: `Show ${AMU}` }).click();
    await screen.getByRole("button", { name: PYTHEAS, exact: true }).click();

    expect(onChange.mock.calls).toEqual([["osu:035xkbk20/PYTHEAS"]]);
  });

  it("should clear the filter from the any-institution row", async () => {
    const { screen, onChange } = await openFilter();

    await screen
      .getByRole("button", { name: "Any institution", exact: true })
      .click();

    expect(onChange.mock.calls).toEqual([[undefined]]);
  });
});
