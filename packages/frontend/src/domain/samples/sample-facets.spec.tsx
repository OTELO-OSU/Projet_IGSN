import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleFacetCounts } from "@projet-igsn/domain/sample/sample-validator";
import type { PublicUser } from "@projet-igsn/domain/user/user-validator";

import { NATURES } from "@projet-igsn/domain/sample/nature";
import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { render } from "vitest-browser-react";

import {
  FACET_SECTIONS,
  type FacetValues,
  SampleFacets,
} from "./sample-facets.tsx";
import { natureLabel } from "./sample-labels.ts";

const LORRAINE = "04vfs2w97";
const TYPE_FACET = "Type";
const MINERAL_CLASSIFICATION_FACET = "Strunz-Mindat (2026) Classifications";
const GROUP = {
  id: "01980e2d-6f9b-7000-9000-000000000001",
  name: "ANR CritMet",
};
const CONTRIBUTOR = {
  id: "01980e2d-6f9b-7000-9000-000000000002",
  name: "Dupont",
  firstname: "Marie",
};
const COUNTS: SampleFacetCounts = {
  nature: { hand_sample: 3, powder: 0 },
  type: { core: 2, "core.piece": 2 },
  mineralClassification: { "9": 1 },
  institutionalLaboratory: { UMR7359: 1, UMR5275: 1 },
  manualGroup: { [GROUP.id]: 1 },
  contributor: { [CONTRIBUTOR.id]: 1 },
};

async function renderFacets(
  values: FacetValues = {},
  manualGroups: ManualGroup[] = [],
  contributors: PublicUser[] = [],
  counts: SampleFacetCounts = COUNTS,
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
      counts={counts}
    />,
  );
  return { screen, onChange, onClearAll };
}

async function expandSection(
  screen: Awaited<ReturnType<typeof render>>,
  section: string,
) {
  const toggle = screen.getByRole("button", { name: section, expanded: false });
  if (toggle.elements().length > 0) await toggle.click();
}

describe("SampleFacets", () => {
  it("should report the picked value of an enum facet", async () => {
    const { screen, onChange } = await renderFacets();

    await screen.getByRole("combobox", { name: "Nature" }).click();
    await screen.getByRole("option").first().click();

    expect(onChange).toHaveBeenCalledWith("nature", "hand_sample");
  });

  it("should report the picked child of a hierarchy facet", async () => {
    const { screen, onChange } = await renderFacets({ type: "core" });

    await screen
      .getByRole("combobox", { name: TYPE_FACET, exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Core Piece (2)", exact: true })
      .click();

    expect(onChange).toHaveBeenCalledWith("type", "core.piece");
  });

  it("should clear a hierarchy facet when its root chip is removed", async () => {
    const { screen, onChange } = await renderFacets({ type: "core" });

    await screen
      .getByRole("button", { name: "Remove Core (2)", exact: true })
      .click();

    expect(onChange).toHaveBeenCalledWith("type", undefined);
  });

  it("should hide clear-all until a facet is active", async () => {
    const { screen } = await renderFacets();

    await expect.element(screen.getByRole("complementary")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /clear all/i }).query(),
    ).toBeNull();
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
    await expandSection(screen, "Scientific context");

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
      /^identity$/i,
      /^sample classification$/i,
      /^age$/i,
      /^scientific context$/i,
      /^declaration$/i,
    ]) {
      await expect.element(screen.getByRole("heading", { name })).toBeVisible();
    }
  });

  it.each([
    { values: {}, chips: [] },
    { values: { nature: "powder" }, chips: ["Nature: Powder"] },
    { values: { type: "core.piece" }, chips: ["Type: Core Piece"] },
    {
      values: { researchProgramName: "mohole" },
      chips: ["Research program: mohole"],
    },
    {
      values: { contributor: CONTRIBUTOR.id },
      chips: ["Contributor: Marie Dupont"],
    },
    {
      values: { ageMin: 1, ageMax: 10, ageUnit: "ga" },
      chips: ["Age ≥ 1 Ga", "Age ≤ 10 Ga"],
    },
    { values: { ageMax: 10 }, chips: ["Age ≤ 10 Ma"] },
    { values: { ageUnit: "ga" }, chips: [] },
    { values: { includeSubSamples: true }, chips: ["Include sub-samples"] },
  ])(
    "should list the active facets $chips above the sections for $values",
    async ({ values, chips }) => {
      const { screen } = await renderFacets(values, [], [CONTRIBUTOR]);

      await expect
        .element(screen.getByRole("complementary"))
        .toBeInTheDocument();
      expect(
        screen
          .getByRole("list", { name: "Active filters" })
          .getByRole("listitem")
          .filter({ hasNotText: "Clear all filters" })
          .elements()
          .map((chip) => chip.textContent),
      ).toEqual(chips);
    },
  );

  it.each([
    { values: { nature: "powder" }, chip: "Nature: Powder", param: "nature" },
    {
      values: { ageMin: 1, ageMax: 10 },
      chip: "Age ≤ 10 Ma",
      param: "ageMax",
    },
  ])(
    "should clear $param when its chip is removed",
    async ({ values, chip, param }) => {
      const { screen, onChange } = await renderFacets(values);

      await screen
        .getByRole("button", { name: `Remove ${chip}`, exact: true })
        .click();

      expect(onChange).toHaveBeenCalledWith(param, undefined);
    },
  );

  it("should empty a text facet once its removed chip clears it", async () => {
    const onChange = vi.fn();
    const facets = (values: FacetValues) => (
      <SampleFacets values={values} onChange={onChange} onClearAll={vi.fn()} />
    );
    const screen = await render(facets({ researchProgramName: "mohole" }));
    onChange.mockImplementation(() => screen.rerender(facets({})));

    await screen
      .getByRole("button", { name: "Remove Research program: mohole" })
      .click();

    await expect
      .element(screen.getByRole("searchbox", { name: "Research program" }))
      .toHaveValue("");
  });

  it.each([
    { values: {}, expanded: ["Identity"] },
    {
      values: { contributor: CONTRIBUTOR.id },
      expanded: ["Identity", "Declaration"],
    },
  ])(
    "should expand at mount the first section and those holding an active facet for $values",
    async ({ values, expanded }) => {
      const { screen } = await renderFacets(values, [], [CONTRIBUTOR]);

      await expect
        .poll(() =>
          FACET_SECTIONS.map((section) => section.title()).filter(
            (title) =>
              screen
                .getByRole("button", { name: title, expanded: true })
                .elements().length > 0,
          ),
        )
        .toEqual(expanded);
    },
  );

  it("should report a picked Strunz category of the mineral classification facet", async () => {
    const { screen, onChange } = await renderFacets({
      material: "rock_and_sediment.mineral",
    });

    await screen
      .getByRole("combobox", { name: MINERAL_CLASSIFICATION_FACET })
      .click();
    await screen
      .getByRole("option", { name: "Silicates (1)", exact: true })
      .click();

    expect(onChange).toHaveBeenCalledWith("mineralClassification", "9");
  });

  it("should hide the mineral classification facet until a mineral material is picked", async () => {
    const { screen } = await renderFacets();
    await expandSection(screen, "Sample classification");

    await expect
      .element(screen.getByRole("combobox", { name: "Material" }))
      .toBeVisible();
    expect(
      screen
        .getByRole("combobox", { name: MINERAL_CLASSIFICATION_FACET })
        .elements(),
    ).toEqual([]);
  });

  it("should report an age bound on blur", async () => {
    const { screen, onChange } = await renderFacets();
    await expandSection(screen, "Age");

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

  it.each([
    { values: {}, reported: true },
    { values: { includeSubSamples: true }, reported: undefined },
  ])(
    "should report the include-sub-samples toggle as $reported",
    async ({ values, reported }) => {
      const { screen, onChange } = await renderFacets(values);

      await screen.getByRole("switch", { name: "Include sub-samples" }).click();

      expect(onChange).toHaveBeenCalledWith("includeSubSamples", reported);
    },
  );

  it("should report the picked manual group", async () => {
    const { screen, onChange } = await renderFacets({}, [GROUP]);
    await expandSection(screen, "Declaration");

    await screen.getByRole("combobox", { name: /other group/i }).click();
    await screen.getByRole("option", { name: GROUP.name }).click();

    expect(onChange).toHaveBeenCalledWith("manualGroup", GROUP.id);
  });

  it("should reach the contributor facet only once its collapsed section is expanded", async () => {
    const { screen, onChange } = await renderFacets({}, [], [CONTRIBUTOR]);
    expect(
      screen.getByRole("combobox", { name: /contributor/i }).elements(),
    ).toEqual([]);

    await screen.getByRole("button", { name: "Declaration" }).click();
    await screen.getByRole("combobox", { name: /contributor/i }).click();
    await screen.getByRole("option", { name: "Marie Dupont" }).click();

    expect(onChange).toHaveBeenCalledWith("contributor", CONTRIBUTOR.id);
  });

  it.each([
    {
      facet: "Nature",
      section: "Identity",
      values: {},
      offered: ["Hand sample (3)"],
    },
    {
      facet: "Nature",
      section: "Identity",
      values: { nature: "powder" },
      offered: ["Hand sample (3)", "Powder"],
    },
    {
      facet: TYPE_FACET,
      section: "Identity",
      values: {},
      offered: ["Core (2)"],
    },
    {
      facet: /other group/i,
      section: "Declaration",
      values: {},
      offered: ["ANR CritMet (1)"],
    },
    {
      facet: /other group/i,
      section: "Declaration",
      values: { manualGroup: "01980e2d-6f9b-7000-9000-000000000003" },
      offered: ["ANR CritMet (1)", "X"],
    },
  ])(
    "should offer only the $facet options with results or selected",
    async ({ facet, section, values, offered }) => {
      const other = { id: "01980e2d-6f9b-7000-9000-000000000003", name: "X" };
      const { screen } = await renderFacets(values, [GROUP, other]);
      await expandSection(screen, section);

      await screen.getByRole("combobox", { name: facet, exact: true }).click();

      await expect
        .poll(() =>
          screen
            .getByRole("option")
            .elements()
            .map((option) => option.textContent),
        )
        .toEqual(offered);
    },
  );

  it("should name the selected contributor without results", async () => {
    const { screen } = await renderFacets(
      { contributor: CONTRIBUTOR.id },
      [],
      [CONTRIBUTOR],
      {},
    );

    await expect
      .element(screen.getByRole("combobox", { name: /contributor/i }))
      .toHaveTextContent("Marie Dupont");
  });

  it("should keep offering the selected hierarchy node without results", async () => {
    const { screen } = await renderFacets({ type: "core" }, [], [], {});

    await screen.getByRole("button", { name: "Core", exact: true }).click();

    await expect
      .element(screen.getByRole("option", { name: "Core", exact: true }))
      .toBeVisible();
  });

  it("should offer every option without a count until the counts load", async () => {
    const screen = await render(
      <SampleFacets values={{}} onChange={vi.fn()} onClearAll={vi.fn()} />,
    );

    await screen.getByRole("combobox", { name: "Nature", exact: true }).click();

    await expect
      .poll(() =>
        screen
          .getByRole("option")
          .elements()
          .map((option) => option.textContent),
      )
      .toEqual(NATURES.map((nature) => natureLabel(nature)));
  });

  it("should disable a facet whose options all have no results", async () => {
    const { screen } = await renderFacets({}, [], [], {});

    await expect
      .element(screen.getByRole("combobox", { name: "Nature" }))
      .toBeDisabled();
  });
});
