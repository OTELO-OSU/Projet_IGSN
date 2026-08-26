import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { PublicUser } from "@projet-igsn/domain/user/user-validator";

import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { render } from "vitest-browser-react";

import { FACET_SECTIONS, SampleFacets } from "./sample-facets.tsx";

const LORRAINE = "04vfs2w97";

async function renderFacets(
  values: Record<string, string | number | undefined> = {},
  manualGroups: ManualGroup[] = [],
  contributors: PublicUser[] = [],
) {
  const onChange = vi.fn();
  const onClearAll = vi.fn();
  const screen = await render(
    <SampleFacets
      values={values}
      onChange={onChange}
      onClearAll={onClearAll}
      manualGroups={manualGroups}
      contributors={contributors}
    />,
  );
  return { screen, onChange, onClearAll };
}

describe("SampleFacets", () => {
  it("should report the picked value of an enum facet", async () => {
    const { screen, onChange } = await renderFacets();

    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByRole("option").first().click();

    expect(onChange).toHaveBeenCalledWith("nature", "hand_sample");
  });

  it("should reveal a child level once a hierarchy node is picked", async () => {
    const { screen, onChange } = await renderFacets({ type: "core" });

    await screen.getByRole("combobox").nth(1).click();
    await screen.getByRole("option").first().click();

    expect(onChange).toHaveBeenCalledWith("type", "core.core");
  });

  it("should disable clear-all until a facet is active", async () => {
    const { screen } = await renderFacets();

    await expect
      .element(screen.getByRole("button", { name: /clear all/i }))
      .toBeDisabled();
  });

  it("should clear every facet when clear-all is pressed", async () => {
    const { screen, onClearAll } = await renderFacets({ type: "core" });

    const button = screen.getByRole("button", { name: /clear all/i });
    await expect.element(button).toBeEnabled();
    await button.click();

    expect(onClearAll).toHaveBeenCalled();
  });

  it("should report a debounced text facet value", async () => {
    const { screen, onChange } = await renderFacets();

    await screen
      .getByRole("searchbox", { name: "Research program", exact: true })
      .fill("mohole");

    await vi.waitFor(() =>
      expect(onChange).toHaveBeenCalledWith("researchProgramName", "mohole"),
    );
  });

  it("should place every registry facet in exactly one section", () => {
    const grouped = FACET_SECTIONS.flatMap((section) => section.keys);
    const registry = SAMPLE_FACETS.map((facet) => facet.key);

    expect(grouped.slice().sort()).toEqual(registry.slice().sort());
  });

  it("should render each facet under its section heading", async () => {
    const { screen } = await renderFacets();

    for (const name of [
      /sample classification/i,
      /sample type/i,
      /author/i,
      /^age$/i,
    ]) {
      await expect.element(screen.getByRole("heading", { name })).toBeVisible();
    }
  });

  it("should report an age bound on blur", async () => {
    const { screen, onChange } = await renderFacets();

    const min = screen.getByRole("spinbutton", { name: "Min" });
    await min.fill("10");
    (min.element() as HTMLElement).blur();

    expect(onChange).toHaveBeenCalledWith("ageMin", 10);
  });

  it("should offer only the laboratories of the picked organization", async () => {
    const { screen } = await renderFacets({
      institutionalOrganization: LORRAINE,
    });

    await screen.getByRole("combobox", { name: "Laboratory" }).click();

    await expect
      .element(screen.getByRole("option", { name: /GéoRessources/ }))
      .toBeVisible();
    expect(screen.getByRole("option", { name: /ISTerre/ }).elements()).toEqual(
      [],
    );
  });

  it("should keep a filtering value the narrowed list dropped visible and clearable", async () => {
    const { screen, onChange } = await renderFacets({
      institutionalLaboratory: "UMR7359",
    });

    const combobox = screen.getByRole("combobox", { name: "Laboratory" });
    await expect.element(combobox).toHaveTextContent(/GéoRessources/);
    await combobox.click();
    await screen.getByRole("option", { name: /GéoRessources/ }).click();

    expect(onChange).toHaveBeenCalledWith("institutionalLaboratory", undefined);
  });

  it("should report the picked manual group", async () => {
    const group = {
      id: "01980e2d-6f9b-7000-9000-000000000001",
      name: "ANR CritMet",
    };
    const { screen, onChange } = await renderFacets({}, [group]);

    await screen.getByRole("combobox", { name: /other group/i }).click();
    await screen.getByRole("option", { name: group.name }).click();

    expect(onChange).toHaveBeenCalledWith("manualGroup", group.id);
  });

  it("should report the picked contributor", async () => {
    const contributor = {
      id: "01980e2d-6f9b-7000-9000-000000000002",
      name: "Dupont",
      firstname: "Marie",
    };
    const { screen, onChange } = await renderFacets({}, [], [contributor]);

    await screen.getByRole("combobox", { name: /contributor/i }).click();
    await screen.getByRole("option", { name: "Marie Dupont" }).click();

    expect(onChange).toHaveBeenCalledWith("contributor", contributor.id);
  });
});
