import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { render } from "vitest-browser-react";

import { FACET_SECTIONS, SampleFacets } from "./sample-facets.tsx";

async function renderFacets(
  values: Record<string, string | number | undefined> = {},
) {
  const onChange = vi.fn();
  const onClearAll = vi.fn();
  const screen = await render(
    <SampleFacets
      values={values}
      onChange={onChange}
      onClearAll={onClearAll}
    />,
  );
  return { screen, onChange, onClearAll };
}

describe("SampleFacets", () => {
  it("should report the picked value of an enum facet", async () => {
    const { screen, onChange } = await renderFacets();

    await screen.getByRole("combobox", { name: "Nature" }).click();
    // Options render in the vocabulary order; the first is hand_sample.
    await screen.getByRole("option").first().click();

    expect(onChange).toHaveBeenCalledWith("nature", "hand_sample");
  });

  it("should reveal a child level once a hierarchy node is picked", async () => {
    // With `type` set to the "core" branch, the cascade shows a second level.
    const { screen, onChange } = await renderFacets({ type: "core" });

    // Index 0 is the Type root; index 1 is the revealed child level.
    await screen.getByRole("combobox").nth(1).click();
    await screen.getByRole("option").first().click();

    // The first child of core is its self-child, composing to "core.core".
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
});
