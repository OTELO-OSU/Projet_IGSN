import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect, it, vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const SECTION = "Strunz-Mindat (2026) Classifications";

type Screen = Awaited<ReturnType<typeof render>>;

const renderClassificationTab = async (
  material: string,
  onSubmit: (value: CreateSample) => void = () => {},
): Promise<Screen> => {
  const screen = await render(
    <SampleForm
      onCancel={() => {}}
      defaultValues={{
        name: "Muscovite schist",
        nature: "thin_section",
        type: null,
        material,
        collectionMethod: null,
        collectionMethodDescription: null,
      }}
      primaryAction={{ kind: "submit", label: "Save", onSubmit }}
    />,
  );
  await screen.getByRole("tab", { name: "Sample classification" }).click();
  return screen;
};

const row = (screen: Screen, index: number) =>
  screen.getByRole("group", { name: `Classification ${index}`, exact: true });

const addRow = async (screen: Screen, index: number) => {
  await screen.getByRole("button", { name: "Add classification" }).click();
  await row(screen, index)
    .getByRole("combobox", { name: "Classification *", exact: true })
    .click();
};

const pickOption = (screen: Screen, name: string) =>
  screen.getByRole("option", { name, exact: true }).click();

const submitted = async (
  screen: Screen,
  onSubmit: ReturnType<typeof vi.fn>,
  mineralClassifications: CreateSample["mineralClassifications"],
) => {
  await screen.getByRole("button", { name: "Save" }).click();
  await vi.waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ mineralClassifications }),
    ),
  );
};

describe("SampleMineralClassificationsFields", () => {
  it.each([
    { material: "rock_and_sediment.mineral", present: true },
    { material: "rock_and_sediment.rock", present: false },
  ])(
    "should offer the classifications on a mineral sample only: $material",
    async ({ material, present }) => {
      const screen = await renderClassificationTab(material);

      const list = screen.getByRole("group", { name: SECTION, exact: true });
      if (present) {
        await expect.element(list).toBeVisible();
      } else {
        await expect.element(list).not.toBeInTheDocument();
      }
    },
  );

  it("should list the classifications before the specific name", async () => {
    const screen = await renderClassificationTab("rock_and_sediment.mineral");

    const list = screen.getByRole("group", { name: SECTION, exact: true });
    await expect.element(list).toBeVisible();
    expect(
      list
        .element()
        .compareDocumentPosition(
          screen.getByLabelText("Specific Name", { exact: true }).element(),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("should submit a mineral found by search with its abundance", async () => {
    const onSubmit = vi.fn();
    const screen = await renderClassificationTab(
      "rock_and_sediment.mineral",
      onSubmit,
    );

    await addRow(screen, 1);
    await screen
      .getByPlaceholder("Search a class or a mineral...")
      .fill("Muscovite");
    await pickOption(screen, "Silicates > Phyllosilicates > Muscovite");
    await row(screen, 1)
      .getByRole("combobox", { name: "Abundance", exact: true })
      .click();
    await pickOption(screen, "Major");

    await submitted(screen, onSubmit, [
      { strunzId: "9.E", mindatId: 2815, abundance: "major" },
    ]);
  });

  it.each([
    {
      levels: ["Silicates"],
      stop: true,
      expected: { strunzId: "9", mindatId: null },
    },
    {
      levels: ["Oxides and Hydroxides", "Hydroxides"],
      stop: true,
      expected: { strunzId: "4.F-G", mindatId: null },
    },
    {
      levels: ["Sulfarsenates, Sulfantimonates", "Metal Sulfides", "Acanthite"],
      stop: false,
      expected: { strunzId: "2.B-E", mindatId: 10 },
    },
    {
      levels: ["Silicates", "Chrysotile"],
      stop: false,
      expected: { strunzId: "9", mindatId: 975 },
    },
  ])(
    "should submit the level browsed down to: $levels",
    async ({ levels, stop, expected }) => {
      const onSubmit = vi.fn();
      const screen = await renderClassificationTab(
        "rock_and_sediment.mineral",
        onSubmit,
      );

      await addRow(screen, 1);
      for (const level of levels) await pickOption(screen, level);
      if (stop) await pickOption(screen, "Stop here");

      await submitted(screen, onSubmit, [expected]);
    },
  );

  it("should submit the rows left once one is removed", async () => {
    const onSubmit = vi.fn();
    const screen = await renderClassificationTab(
      "rock_and_sediment.mineral",
      onSubmit,
    );

    await addRow(screen, 1);
    await pickOption(screen, "Silicates");
    await pickOption(screen, "Stop here");
    await addRow(screen, 2);
    await pickOption(screen, "Oxides and Hydroxides");
    await pickOption(screen, "Stop here");
    await row(screen, 1)
      .getByRole("button", { name: "Remove classification 1" })
      .click();

    await submitted(screen, onSubmit, [{ strunzId: "4", mindatId: null }]);
  });
});
