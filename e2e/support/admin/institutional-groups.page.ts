import { expect, type Page } from "@playwright/test";

import { chooseOption } from "./choose-option.ts";

const INTRO = "tell us which institution you belong to";

export function institutionalGroupsPage(page: Page) {
  const choose = chooseOption(page);

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
