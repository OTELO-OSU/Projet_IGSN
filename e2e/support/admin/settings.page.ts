import { expect, type Page } from "@playwright/test";

import { chooseOption } from "./choose-option.ts";

export function settingsPage(page: Page) {
  return {
    open: async () => {
      await page.getByRole("link", { name: "Settings" }).click();
      await expect(
        page.getByRole("heading", { name: "Settings" }),
      ).toBeVisible();
    },
    setOrcid: async (orcid: string) => {
      const form = page.getByRole("form", { name: "ORCID iD" });
      await form.getByLabel("ORCID iD").fill(orcid);
      await form.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("ORCID iD saved")).toBeVisible();
    },
    setInstitution: async (groups: {
      organization: string;
      osu: string;
      laboratory: string;
    }) => {
      const form = page.getByRole("form", { name: "Institution" });
      const choose = chooseOption(page, form);
      await choose("Organization", groups.organization);
      await choose("OSU", groups.osu);
      await choose("Laboratory", groups.laboratory);
      await form.getByRole("button", { name: "Save" }).click();
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(page.getByText("Institution saved")).toBeVisible();
    },
    expectInstitution: (laboratory: string) =>
      expect(
        page
          .getByRole("form", { name: "Institution" })
          .getByRole("combobox", { name: "Laboratory" }),
      ).toContainText(laboratory),
    expectManualGroup: (name: string) =>
      expect(
        page.getByRole("listitem").filter({ hasText: name }),
      ).toBeVisible(),
    expectNoManualGroupEditControl: async () => {
      await expect(
        page.getByRole("textbox", { name: "Group name" }),
      ).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Associate a user" }),
      ).toBeHidden();
    },
  };
}
