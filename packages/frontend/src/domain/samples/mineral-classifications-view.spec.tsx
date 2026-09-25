import { render } from "vitest-browser-react";

import { MineralClassificationsView } from "./mineral-classifications-view.tsx";

const MUSCOVITE = 2815;
const CHRYSOTILE = 975;

describe("MineralClassificationsView", () => {
  it.each([
    { row: { strunzId: "9" }, steps: ["Silicates"] },
    {
      row: { strunzId: "9.E" },
      steps: ["Silicates", "Phyllosilicates"],
    },
    {
      row: { strunzId: "9.E", mindatId: MUSCOVITE },
      steps: ["Silicates", "Phyllosilicates", "Muscovite"],
    },
    {
      row: { strunzId: "9", mindatId: CHRYSOTILE },
      steps: ["Silicates", "Chrysotile"],
    },
  ])(
    "should show the breadcrumb $steps for its classification",
    async ({ row, steps }) => {
      const screen = await render(
        <MineralClassificationsView mineralClassifications={[row]} />,
      );

      const breadcrumb = screen.getByRole("list", { name: "Classification" });
      await expect.element(breadcrumb).toBeVisible();
      expect(
        breadcrumb
          .getByRole("listitem")
          .elements()
          .map((item) => item.textContent),
      ).toEqual(steps);
    },
  );

  it("should show a mineral's abundance, Strunz code and Mindat link", async () => {
    const screen = await render(
      <MineralClassificationsView
        mineralClassifications={[
          { strunzId: "9.E", mindatId: MUSCOVITE, abundance: "major" },
        ]}
      />,
    );

    await expect.element(screen.getByText("Major")).toBeVisible();
    await expect.element(screen.getByText("9.E.161")).toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: "2815" }))
      .toHaveAttribute("href", "https://www.mindat.org/min-2815.html");
  });

  it("should show no abundance, Strunz code or Mindat link for a class without a mineral", async () => {
    const screen = await render(
      <MineralClassificationsView
        mineralClassifications={[{ strunzId: "9" }]}
      />,
    );

    await expect
      .element(screen.getByRole("list", { name: "Classification" }))
      .toBeVisible();
    for (const label of ["Abundance", "Strunz code", "Mindat ID"]) {
      await expect.element(screen.getByText(label)).not.toBeInTheDocument();
    }
    await expect.element(screen.getByRole("link")).not.toBeInTheDocument();
  });
});
