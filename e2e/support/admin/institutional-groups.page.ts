import { expect, type Page } from "@playwright/test";

const INTRO = "tell us which institution you belong to";

export function institutionalGroupsPage(page: Page) {
  const choose = async (field: string, option: string) => {
    await page.getByRole("combobox", { name: field }).click();
    await page.getByRole("option", { name: option }).click();
  };

  return {
    expectShown: () => expect(page.getByText(INTRO)).toBeVisible(),
    expectNotShown: () => expect(page.getByText(INTRO)).toBeHidden(),
    declare: async (groups: {
      organization: string;
      osu: string;
      laboratory: string;
    }) => {
      await choose("Organization", groups.organization);
      await choose("OSU", groups.osu);
      await choose("Laboratory", groups.laboratory);
      await page.getByRole("button", { name: "Save" }).click();
    },
  };
}
